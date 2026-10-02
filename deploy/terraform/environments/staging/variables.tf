variable "ssh_host" {
  type = string
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

variable "kubeconfig_local_path" {
  type    = string
  default = "~/.kube/nestlancer-staging.yaml"
}

variable "app_domain" {
  type = string
}
