<div align="center">

# Terraform — K3s on VPS

### Terraform does **not** provision EKS. It targets a **VPS you control** (Hetzner, DigitalOcean, bare metal, etc.) and installs **K3s** over SSH.

</div>

---

## 📖 Table of Contents

- [Prerequisites](#prerequisites)
- [Usage](#usage)
- [Modules](#modules)
- [Secrets](#secrets)
- [Staging](#staging)

---

## Prerequisites

- Terraform >= 1.5
- SSH access to the VPS as root or a sudo user
- Domain DNS pointing at the VPS (for TLS / ingress)

---

## Usage

```bash
cd deploy/terraform/environments/production
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars (host, SSH key, domain)

terraform init
terraform plan
terraform apply
```

Outputs include `kubeconfig_path` — use it for manifests:

```bash
export KUBECONFIG="$(terraform output -raw kubeconfig_path)"
kubectl apply -k ../../../k3s/overlays/production
```

---

## Modules

| Module | Purpose |
| :--- | :--- |
| `modules/vps-k3s` | Install K3s via SSH, fetch kubeconfig, optional Traefik tuning |

---

## Secrets

- App secrets: **Infisical** → Kubernetes `Secret` (see `k3s/base/secrets.example.yaml`)
- **GHCR pull**: `kubectl create secret docker-registry ghcr-credentials` (see `k3s/base/ghcr-pull-secret.example.yaml`) — required for private images at `ghcr.io`
- Terraform state: use remote backend (S3 + DynamoDB, Terraform Cloud, etc.) — configure in `environments/*/backend.tf`

---

## Staging

Duplicate `environments/production` as `environments/staging` with different `k3s_channel`, domain, and Infisical env.