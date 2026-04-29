#!/usr/bin/env python3
"""
Exec credential plugin for OKE clusters.
Called by the kubernetes client when kubeconfig uses the OCI exec plugin.
Uses OCI instance principal (already configured in the container) to generate
the same short-lived bearer token that `oci ce cluster generate-token` produces.
"""
import json
import sys
import datetime

try:
    import oci
    signer = oci.auth.signers.InstancePrincipalsSecurityTokenSigner()
    token = signer.get_security_token()
    exp = (datetime.datetime.utcnow() + datetime.timedelta(minutes=14)).strftime("%Y-%m-%dT%H:%M:%SZ")
    print(json.dumps({
        "apiVersion": "client.authentication.k8s.io/v1beta1",
        "kind": "ExecCredential",
        "status": {"token": token, "expirationTimestamp": exp},
    }))
except Exception as e:
    print(f"oke_token.py error: {e}", file=sys.stderr)
    sys.exit(1)
