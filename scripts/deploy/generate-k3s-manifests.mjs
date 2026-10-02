#!/usr/bin/env node
/**
 * Generates K3s Deployment + Service + Ingress manifests from workloads.manifest.json.
 * Images use GHCR (imageRegistry).
 * Run: node scripts/deploy/generate-k3s-manifests.mjs  (or pnpm k3s:generate)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(
  readFileSync(join(root, 'scripts/docker/workloads.manifest.json'), 'utf8')
);
const imageRegistry = manifest.imageRegistry ?? 'ghcr.io/nestlancer';
const rawK8sOverrideRegistry = process.env.K8S_IMAGE_REGISTRY_OVERRIDE ?? manifest.k8sImageRegistryOverride;
const k8sOverrideRegistry =
  !rawK8sOverrideRegistry || rawK8sOverrideRegistry === 'ghcr.io/your-org'
    ? imageRegistry
    : rawK8sOverrideRegistry;
const defaultTag = manifest.k8sDefaultImageTag ?? 'latest';
const wsPath = manifest.ingress?.wsPath ?? '/ws';
const productionEnv = manifest.environments?.production ?? {
  namespace: 'nestlancer',
  apiHost: 'api.nestlancer.com',
  imageTag: 'latest',
  tls: true,
  certManagerIssuer: 'letsencrypt-prod',
};
const outDir = join(root, 'deploy/k3s/base/workloads');
mkdirSync(outDir, { recursive: true });

const resources = [];
const imageIds = [];

function imageRef(imageId) {
  return `${imageRegistry}/${imageId}:${defaultTag}`;
}

function deploymentYaml(name, imageId, port, replicas = 1, withGatewayConfig = false) {
  imageIds.push(imageId);
  const configMapEnv = withGatewayConfig
    ? `
            - configMapRef:
                name: gateway-config`
    : '';
  const probes =
    port != null
      ? `
          readinessProbe:
            httpGet:
              path: /api/v1/health/ready
              port: http
            initialDelaySeconds: 20
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /api/v1/health/live
              port: http
            initialDelaySeconds: 30
            periodSeconds: 20`
      : '';
  const portBlock =
    port != null
      ? `
          ports:
            - containerPort: ${port}
              name: http`
      : '';
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  labels:
    app: ${name}
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
      app: ${name}
  template:
    metadata:
      labels:
        app: ${name}
    spec:
      imagePullSecrets:
        - name: ghcr-credentials
      containers:
        - name: ${name}
          image: ${imageRef(imageId)}
          imagePullPolicy: IfNotPresent${portBlock}
          envFrom:
            - secretRef:
                name: nestlancer-secrets${configMapEnv}
          env:
            - name: NODE_ENV
              value: production${port != null ? `\n            - name: PORT\n              value: "${port}"` : ''}${probes}
          resources:
            requests:
              cpu: 50m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
`;
}

function serviceYaml(name, port, exposePort = port) {
  return `apiVersion: v1
kind: Service
metadata:
  name: ${name}
spec:
  selector:
    app: ${name}
  ports:
    - port: ${exposePort}
      targetPort: http
      name: http
`;
}

function ingressYaml(apiHost, envConfig) {
  const tls = envConfig.tls !== false;
  const issuer = envConfig.certManagerIssuer;
  const annotations = [
    '    traefik.ingress.kubernetes.io/router.entrypoints: websecure',
    '    traefik.ingress.kubernetes.io/router.tls: "true"',
  ];
  if (issuer) {
    annotations.push(`    cert-manager.io/cluster-issuer: "${issuer}"`);
  }
  if (!tls) {
    return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nestlancer-api
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web
spec:
  ingressClassName: traefik
  rules:
    - host: ${apiHost}
      http:
        paths:
          - path: ${wsPath}
            pathType: Prefix
            backend:
              service:
                name: ws-gateway
                port:
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: gateway
                port:
                  number: 80
`;
  }
  return `# K3s default ingress: Traefik (installed with K3s).
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nestlancer-api
  annotations:
${annotations.join('\n')}
spec:
  ingressClassName: traefik
  rules:
    - host: ${apiHost}
      http:
        paths:
          - path: ${wsPath}
            pathType: Prefix
            backend:
              service:
                name: ws-gateway
                port:
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: gateway
                port:
                  number: 80
  tls:
    - hosts:
        - ${apiHost}
      secretName: nestlancer-api-tls
`;
}

function kustomizeImagesBlock(tag) {
  const uniqueIds = [...new Set(imageIds)];
  const lines = uniqueIds.map((id) => {
    const baseName = `${imageRegistry}/${id}`;
    const overrideName = `${k8sOverrideRegistry}/${id}`;
    return `  - name: ${baseName}
    newName: ${overrideName}
    newTag: ${tag}`;
  });
  return `images:\n${lines.join('\n')}`;
}

function writeOverlay(envName, envConfig) {
  const overlayDir = join(root, 'deploy/k3s/overlays', envName);
  mkdirSync(overlayDir, { recursive: true });
  const tag = envConfig.imageTag ?? defaultTag;
  writeFileSync(
    join(overlayDir, 'kustomization.yaml'),
    `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: ${envConfig.namespace}

resources:
  - ../../base

patches:
  - target:
      kind: Ingress
      name: nestlancer-api
    patch: |-
      - op: replace
        path: /spec/rules/0/host
        value: ${envConfig.apiHost}
      - op: replace
        path: /spec/tls/0/hosts/0
        value: ${envConfig.apiHost}

# Image overrides (defaults to imageRegistry; set K8S_IMAGE_REGISTRY_OVERRIDE or k8sImageRegistryOverride to customize)
${kustomizeImagesBlock(tag)}
`
  );
}

const gatewayIds = new Set((manifest.gateways ?? []).map((g) => g.k8sName));

for (const g of manifest.gateways ?? []) {
  const depFile = `${g.k8sName}-deployment.yaml`;
  writeFileSync(
    join(outDir, depFile),
    deploymentYaml(g.k8sName, g.id, g.port, 1, g.id === 'gateway')
  );
  resources.push(`workloads/${depFile}`);
  const svcFile = `${g.k8sName}-service.yaml`;
  writeFileSync(join(outDir, svcFile), serviceYaml(g.k8sName, g.port, 80));
  resources.push(`workloads/${svcFile}`);
}

for (const s of manifest.services ?? []) {
  const depFile = `${s.k8sName}-deployment.yaml`;
  writeFileSync(join(outDir, depFile), deploymentYaml(s.k8sName, s.id, s.port));
  resources.push(`workloads/${depFile}`);
  const svcFile = `${s.k8sName}-service.yaml`;
  writeFileSync(join(outDir, svcFile), serviceYaml(s.k8sName, s.port));
  resources.push(`workloads/${svcFile}`);
}

for (const w of manifest.workers ?? []) {
  const depFile = `${w.k8sName}-deployment.yaml`;
  writeFileSync(join(outDir, depFile), deploymentYaml(w.k8sName, w.id, null, 1));
  resources.push(`workloads/${depFile}`);
}

writeFileSync(
  join(root, 'deploy/k3s/base/ingress.yaml'),
  ingressYaml(productionEnv.apiHost, productionEnv)
);

const certManagerDir = join(root, 'deploy/k3s/base/cert-manager');
mkdirSync(certManagerDir, { recursive: true });
writeFileSync(
  join(certManagerDir, 'cluster-issuer.yaml'),
  `# Install cert-manager on the cluster once before applying:
# kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: ops@nestlancer.com
    privateKeySecretRef:
      name: letsencrypt-staging-account
    solvers:
      - http01:
          ingress:
            class: traefik
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@nestlancer.com
    privateKeySecretRef:
      name: letsencrypt-prod-account
    solvers:
      - http01:
          ingress:
            class: traefik
`
);
writeFileSync(
  join(certManagerDir, 'kustomization.yaml'),
  `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - cluster-issuer.yaml
`
);

const kustomizationPath = join(root, 'deploy/k3s/base/kustomization.yaml');
const baseResources = [
  'namespace.yaml',
  'configmap.yaml',
  'ingress.yaml',
  ...resources,
];
const unique = [...new Set(baseResources)];
writeFileSync(
  kustomizationPath,
  `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: ${productionEnv.namespace}

resources:
${unique.map((r) => `  - ${r}`).join('\n')}

# Apply secrets separately (not committed):
# kubectl create secret generic nestlancer-secrets -n <namespace> --from-env-file=.env.production
# kubectl create secret docker-registry ghcr-credentials -n <namespace> \\
#   --docker-server=ghcr.io --docker-username=GITHUB_USER --docker-password=GITHUB_PAT
# ClusterIssuer (once per cluster): kubectl apply -k deploy/k3s/base/cert-manager
`
);

const ghcrExamplePath = join(root, 'deploy/k3s/base/ghcr-pull-secret.example.yaml');
writeFileSync(
  ghcrExamplePath,
  `# Create before applying workloads (private GHCR packages):
#   kubectl create secret docker-registry ghcr-credentials -n <namespace> \\
#     --docker-server=ghcr.io \\
#     --docker-username=YOUR_GITHUB_USERNAME \\
#     --docker-password=ghp_xxx
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-credentials
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: e30=
`
);

writeFileSync(
  join(root, 'deploy/k3s/base/namespace.yaml'),
  `apiVersion: v1
kind: Namespace
metadata:
  name: ${productionEnv.namespace}
  labels:
    app.kubernetes.io/part-of: nestlancer
`
);

function writeLocalOverlay(_envName, envConfig) {
  const overlayDir = join(root, 'deploy/k3s/overlays/local');
  mkdirSync(overlayDir, { recursive: true });
  writeFileSync(
    join(overlayDir, 'kustomization.yaml'),
    `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: ${envConfig.namespace}

resources:
  - ../../base

patches:
  - target:
      kind: Ingress
      name: nestlancer-api
    patch: |-
      - op: replace
        path: /metadata/annotations
        value:
          traefik.ingress.kubernetes.io/router.entrypoints: web
      - op: remove
        path: /spec/tls
      - op: replace
        path: /spec/rules/0/host
        value: ${envConfig.apiHost}

${kustomizeImagesBlock(envConfig.imageTag ?? 'local')}
`
  );
}

const overlayEnvs = Object.keys(manifest.environments ?? {});
for (const envName of overlayEnvs) {
  if (envName === 'local') {
    writeLocalOverlay(envName, manifest.environments[envName]);
  } else {
    writeOverlay(envName, manifest.environments[envName]);
  }
}

console.log(`Wrote ${resources.length} workload manifests (${imageIds.length} images @ ${imageRegistry})`);
console.log(`Ingress: ${productionEnv.apiHost} + ${wsPath} → ws-gateway`);
console.log(`Overlays: ${overlayEnvs.join(', ')}`);
