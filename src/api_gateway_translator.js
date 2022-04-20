exports.setupPath = (app, method, path, callback) => {
    method = method.toLowerCase()
    if (method === "get") {
        app.get(path, callback)
    } else if (method === "post") {
        app.post(path, callback)
    } else if (method === "patch") {
        app.patch(path, callback)
    } else if (method === "delete") {
        app.delete(path, callback)
    }
}

exports.getPath = (pathToConvert) => {
    return pathToConvert.replaceAll("$", "").replaceAll("{", ":").replaceAll("}", "")
}

exports.translateRequest = (req) => {
    return {
        headers: req.headers,
        pathParameters: req.params,
        queryStringParameters: req.query,
        body: req.body
    }
}