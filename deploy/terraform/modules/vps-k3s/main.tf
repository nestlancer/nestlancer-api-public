terraform {
  required_providers {
    null = {
      source  = "hashicorp/null"
      version = ">= 3.2"
    }
    local = {
      source  = "hashicorp/local"
      version = ">= 2.4"
    }
  }
}

resource "null_resource" "k3s_install" {
  triggers = {
    host    = var.ssh_host
    channel = var.k3s_channel
  }

  connection {
    type        = "ssh"
    host        = var.ssh_host
    user        = var.ssh_user
    private_key = file(var.ssh_private_key_path)
  }

  provisioner "remote-exec" {
    inline = concat(
      [
        "set -euo pipefail",
        "if ! command -v k3s >/dev/null 2>&1; then",
        "  curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=${var.k3s_channel} sh -",
        "fi",
        "systemctl is-active --quiet k3s || systemctl start k3s",
        "mkdir -p /root/.kube",
        "cp /etc/rancher/k3s/k3s.yaml /root/.kube/config",
        "chmod 600 /root/.kube/config",
      ],
      var.k3s_disable_traefik ? ["kubectl -n kube-system delete helmchart traefik -n kube-system --ignore-not-found 2>/dev/null || true"] : []
    )
  }
}

resource "null_resource" "fetch_kubeconfig" {
  depends_on = [null_resource.k3s_install]

  triggers = {
    host = var.ssh_host
  }

  connection {
    type        = "ssh"
    host        = var.ssh_host
    user        = var.ssh_user
    private_key = file(var.ssh_private_key_path)
  }

  provisioner "remote-exec" {
    inline = ["cat /etc/rancher/k3s/k3s.yaml"]
  }

  provisioner "local-exec" {
    command = <<-EOT
      mkdir -p "$(dirname "${var.kubeconfig_local_path}")"
      ssh -i "${var.ssh_private_key_path}" -o StrictHostKeyChecking=accept-new \
        ${var.ssh_user}@${var.ssh_host} 'cat /etc/rancher/k3s/k3s.yaml' \
        | sed "s/127.0.0.1/${var.ssh_host}/" > "${var.kubeconfig_local_path}"
      chmod 600 "${var.kubeconfig_local_path}"
    EOT
  }
}
