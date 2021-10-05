{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "webhook.name" -}}
{{- default .Release.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "registry-mirror.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Generate certificates for webhook api server 
*/}}
{{- define "webhook.gen-certs" -}}
{{- $altNames := list ( printf "%s.%s" (include "webhook.name" .) .Values.namespace ) ( printf "%s.%s.svc" (include "webhook.name" .) .Values.namespace ) -}}
{{- $ca := genCA "admission_ca" 365 -}}
{{- $cert := genSignedCert ( include "webhook.name" . ) nil $altNames 365 $ca -}}
{{- $clientCA := $ca.Cert | b64enc | trim }}
{{- $serverCRT := $cert.Cert | b64enc | trim }}
{{- $serverKey := $cert.Key | b64enc | trim }}
{{- (dict "ca" $clientCA "crt" $serverCRT "key" $serverKey) | toJson -}}
{{- end -}}

{{/*
Common Labels
*/}}
{{- define "registry-mirror.labels" }}
helm.sh/chart: {{ include "registry-mirror.chart" .}}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}