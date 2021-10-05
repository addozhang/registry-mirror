(config => 
  pipy({
    _registries: config.registries,
    mirrorFunc: (patch, container, i, init, mirror) => (
    mirror = Object.entries(_registries).find(([k,v]) => container.image.startsWith(k)),
      mirror && (
      console.log(`Replacing registry to ${mirror[1]} for ${container.image}`),
      container.image = container.image.replace(mirror[0], mirror[1]),
      patch.push({
        "op": "replace",
        "path": init ? `/spec/initContainers/${i}/image` : `/spec/containers/${i}/image`,
        "value": container.image.replace(mirror[0], mirror[1]).split('@')[0] //digest changed
      })
      )
    )
})

  .listen(os.env.LISTENING_PORT || 6443)
  .acceptTLS('tls-offloaded', {
    certificate: {
      cert: new crypto.Certificate(os.readFile('/certs/tls.crt')),
      key: new crypto.PrivateKey(os.readFile('/certs/tls.key')),
    }
  })

  .pipeline('tls-offloaded')
  .decodeHTTPRequest()
  .replaceMessage(
    (msg, req, result, patch, mirror, i) => (
      req = JSON.decode(msg.body),
      i = 0,
      patch = [],
      req.request.object.spec.initContainers && req.request.object.spec.initContainers.forEach(container => mirrorFunc(patch, container, i++, true)),
      i = 0,
      req.request.object.spec.containers.forEach(container => mirrorFunc(patch, container, i++)),

      patch.length > 0 ? (
        result = {
            "apiVersion": "admission.k8s.io/v1",
            "kind": "AdmissionReview",
            "response": {
              "allowed": true,
              "uid": req.request.uid,
              "patchType": "JSONPatch",
              "patch": new Data(JSON.stringify(patch)).toString('base64')
            },
          }
      ) : (
        result = {
          "apiVersion": "admission.k8s.io/v1",
          "kind": "AdmissionReview",
          "response": {
            "allowed": true,
            "uid": req.request.uid
          },
        }
      ),
      console.log(JSON.stringify(result)),
      new Message({
        'status': 200,
        'headers': {
          'Content-Type': 'application/json',
          'Connection': 'Close'
        }
      }, JSON.encode(result))

    )
  )
  .encodeHTTPResponse()
)(JSON.decode(pipy.load('config.json')))