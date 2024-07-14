#!/bin/bash

# Create the certificate.cnf file with the specified content
cat <<EOL > certificate.cnf

[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = v3_req
distinguished_name = dn
[dn]
C = GB
ST = London
L = London
O = My Organisation
OU = My Organisational Unit
emailAddress = email@domain.com
CN = localhost
[v3_req]
subjectAltName = @alt_names
[alt_names]
DNS.1 = localhost
EOL

# Run the OpenSSL command to generate the certificate
openssl req -new -x509 -newkey rsa:2048 -sha256 -nodes -keyout localhost.key -days 3560 -out localhost.crt -config certificate.cnf
