variable "ssh_host" {
  type        = string
  description = "VPS public IP or hostname"
}

variable "ssh_user" {
  type        = string
  default     = "root"
  description = "SSH user with sudo"
}

variable "ssh_private_key_path" {
  type        = string
  description = "Path to private key for SSH"
}

variable "k3s_channel" {
  type        = string
  default     = "stable"
  description = "K3s release channel (stable|latest|v1.xx)"
}

variable "k3s_disable_traefik" {
  type        = bool
  default     = false
  description = "Set true only if you install another ingress controller"
}

variable "kubeconfig_local_path" {
  type        = string
  default     = "~/.kube/nestlancer-k3s.yaml"
  description = "Where to write kubeconfig on the machine running Terraform"
}
