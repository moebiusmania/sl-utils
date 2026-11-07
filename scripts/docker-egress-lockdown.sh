#!/usr/bin/env bash
set -euo pipefail

CHAIN="SL_UTILS_EGRESS"
INPUT_CHAIN="SL_UTILS_INPUT"
SUBNET="${SL_UTILS_SUBNET:-172.28.0.0/24}"
# Upstream resolvers that Docker's embedded DNS forwards to. Queries leave from
# the container namespace, so they must be allowed before the private-range drops.
# Defaults to the host's IPv4 resolvers, read the same way Docker does: when the
# host uses a loopback stub resolver, Docker uses the systemd-resolved upstreams.
host_resolvers() {
  local conf=/etc/resolv.conf
  if grep -qE '^nameserver[[:space:]]+127\.' "$conf" &&
    [[ -r /run/systemd/resolve/resolv.conf ]]; then
    conf=/run/systemd/resolve/resolv.conf
  fi
  awk '$1 == "nameserver" && $2 ~ /^[0-9.]+$/ && $2 !~ /^127\./ { print $2 }' "$conf"
}
DNS_SERVERS="${SL_UTILS_DNS:-$(host_resolvers | tr '\n' ' ')}"
IPTABLES=(iptables -w 5)

if [[ ${EUID} -ne 0 ]]; then
  echo "error: run this script as root" >&2
  exit 1
fi

detach() {
  while "${IPTABLES[@]}" -C DOCKER-USER -s "$SUBNET" -j "$CHAIN" >/dev/null 2>&1; do
    "${IPTABLES[@]}" -D DOCKER-USER -s "$SUBNET" -j "$CHAIN"
  done
  while "${IPTABLES[@]}" -C INPUT -s "$SUBNET" -j "$INPUT_CHAIN" >/dev/null 2>&1; do
    "${IPTABLES[@]}" -D INPUT -s "$SUBNET" -j "$INPUT_CHAIN"
  done
}

if [[ "${1:-}" == "--remove" ]]; then
  detach
  "${IPTABLES[@]}" -F "$CHAIN" >/dev/null 2>&1 || true
  "${IPTABLES[@]}" -X "$CHAIN" >/dev/null 2>&1 || true
  "${IPTABLES[@]}" -F "$INPUT_CHAIN" >/dev/null 2>&1 || true
  "${IPTABLES[@]}" -X "$INPUT_CHAIN" >/dev/null 2>&1 || true
  echo "Removed egress lockdown for $SUBNET"
  exit 0
fi

if ! "${IPTABLES[@]}" -L DOCKER-USER >/dev/null 2>&1; then
  echo "error: DOCKER-USER chain not found; is Docker running?" >&2
  exit 1
fi

if [[ -z "${DNS_SERVERS// /}" ]]; then
  echo "warning: no IPv4 DNS resolvers found; set SL_UTILS_DNS or DNS will be blocked" >&2
fi

# Create the chains if needed, then reset them so the script is idempotent.
"${IPTABLES[@]}" -N "$CHAIN" >/dev/null 2>&1 || true
"${IPTABLES[@]}" -F "$CHAIN"
"${IPTABLES[@]}" -N "$INPUT_CHAIN" >/dev/null 2>&1 || true
"${IPTABLES[@]}" -F "$INPUT_CHAIN"

# Block new connections from the container to host services. Established
# connections must keep working for the published port.
"${IPTABLES[@]}" -A "$INPUT_CHAIN" -m conntrack --ctstate RELATED,ESTABLISHED -j RETURN
"${IPTABLES[@]}" -A "$INPUT_CHAIN" -j DROP

# Allow return traffic for connections that were already permitted.
"${IPTABLES[@]}" -A "$CHAIN" -m conntrack --ctstate RELATED,ESTABLISHED -j RETURN

# Upstream DNS used by Docker's embedded resolver (127.0.0.11 itself never
# leaves the container namespace, so it needs no rule here).
for dns in $DNS_SERVERS; do
  "${IPTABLES[@]}" -A "$CHAIN" -d "$dns" -p udp --dport 53 -j RETURN
  "${IPTABLES[@]}" -A "$CHAIN" -d "$dns" -p tcp --dport 53 -j RETURN
done

# Block the Compose network itself (gateway and any other containers).
"${IPTABLES[@]}" -A "$CHAIN" -d "$SUBNET" -j DROP

# Block private, link-local, and CGNAT destinations.
for cidr in 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 169.254.0.0/16 100.64.0.0/10; do
  "${IPTABLES[@]}" -A "$CHAIN" -d "$cidr" -j DROP
done

# Only allow outbound public HTTP/HTTPS.
"${IPTABLES[@]}" -A "$CHAIN" -p tcp -m multiport --dports 80,443 -j RETURN

# Drop everything else.
"${IPTABLES[@]}" -A "$CHAIN" -j DROP

# Attach the chains once.
if ! "${IPTABLES[@]}" -C DOCKER-USER -s "$SUBNET" -j "$CHAIN" >/dev/null 2>&1; then
  "${IPTABLES[@]}" -I DOCKER-USER -s "$SUBNET" -j "$CHAIN"
fi
if ! "${IPTABLES[@]}" -C INPUT -s "$SUBNET" -j "$INPUT_CHAIN" >/dev/null 2>&1; then
  "${IPTABLES[@]}" -I INPUT -s "$SUBNET" -j "$INPUT_CHAIN"
fi

echo "Egress lockdown enabled for $SUBNET"
