output "kubeconfig_path" {
  value = module.k3s.kubeconfig_path
}

output "kubectl_apply_hint" {
  value = "KUBECONFIG=${module.k3s.kubeconfig_path} kubectl apply -k deploy/k3s/overlays/staging"
}
