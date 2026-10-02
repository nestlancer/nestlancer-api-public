output "kubeconfig_path" {
  description = "Local path to kubeconfig for this K3s cluster"
  value       = var.kubeconfig_local_path
}

output "api_server_host" {
  description = "K3s API server host (VPS IP)"
  value       = var.ssh_host
}
