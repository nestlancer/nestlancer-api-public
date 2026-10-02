output "kubeconfig_path" {
  value = module.k3s.kubeconfig_path
}

output "api_server_host" {
  value = module.k3s.api_server_host
}

output "kubectl_apply_hint" {
  value = "KUBECONFIG=${module.k3s.kubeconfig_path} kubectl apply -k deploy/k3s/overlays/production"
}
