terraform {
  required_version = ">= 1.5"

  required_providers {
    null = {
      source  = "hashicorp/null"
      version = ">= 3.2"
    }
  }
}

module "k3s" {
  source = "../../modules/vps-k3s"

  ssh_host              = var.ssh_host
  ssh_user              = var.ssh_user
  ssh_private_key_path  = var.ssh_private_key_path
  k3s_channel           = var.k3s_channel
  kubeconfig_local_path = var.kubeconfig_local_path
}
