variable "ssh_host" {
  type        = string
  description = "Production VPS IP or hostname"
}

variable "ssh_user" {
  type    = string
  default = "root"
}

variable "ssh_private_key_path" {
  type = string
}

variable "k3s_channel" {
  type    = string
  default = "stable"
}

variable "k3s_disable_traefik" {
  type    = bool
  default = false
}

variable "kubeconfig_local_path" {
  type    = string
  default = "~/.kube/nestlancer-production.yaml"
}

variable "app_domain" {
  type        = string
  description = "Public API hostname (e.g. api.nestlancer.com)"
}
