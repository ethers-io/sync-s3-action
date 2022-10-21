import fs from "fs";
import { join, relative, resolve } from "path";

import { CloudFront, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { S3, PutObjectCommand } from "@aws-sdk/client-s3";


function getMime(filename) {
    switch (filename.split('.').pop().toLowerCase()) {
        case 'css':      return 'text/css';
        case 'doctree':  return 'application/x-doctree';
        case 'eot':      return 'application/vnd.ms-fontobject';
        case 'gif':      return 'image/gif';
        case 'html':     return 'text/html';
        case 'ico':      return 'image/x-icon';
        case 'js':       return 'application/javascript';
        case 'jpg':      return 'image/jpeg';
        case 'jpeg':     return 'image/jpeg';
        case 'json':     return 'application/json';
        case 'md':       return 'text/markdown';
        case 'pickle':   return 'application/x-pickle';
        case 'png':      return 'image/png';
        case 'svg':      return 'image/svg+xml';
        case 'ttf':      return 'application/x-font-ttf';
        case 'txt':      return 'text/plain';
        case 'woff':     return 'application/font-woff';
    }
    console.log('NO MIME', filename);

    return "application/octet-stream";
}

function stall(duration) {
    return new Promise((resolve) => { setTimeout(resolve, duration); });
}

async function upload(s3, bucket, content, key) {
    const params = {
        Bucket: bucket,
        ACL: 'public-read',
        Body: content,
        Key: key,
        ContentType: getMime(key)
    };

    const result = await s3.send(new PutObjectCommand(params));

    return result.Key;
}

function _walk(path, result) {
    const stat = fs.statSync(path);
    if (stat.isDirectory()) {
        for (const filename of fs.readdirSync(path)) {
            _walk(join(path, filename), result);
        }
        return;
    }
    result.push(path);
}

function walk(path) {
    const result = [ ];
    _walk(path, result);
    return result;
}

const MAX_CONNECTIONS = 10;

export async function syncS3(options) {
    const credentials = {
        credentials: {
            accessKeyId: options.accessKeyId,
            secretAccessKey: options.secretAccessKey,
        },
        region: "us-east-1"
    }

    const s3 = new S3(credentials);
    const cloudfront = new CloudFront(credentials);

    const paths = walk(options.sourceFolder);
    console.log(`Uploading ${ paths.length } files to ${ options.bucket }.`);

    const sourcePrefix = resolve(options.sourcePrefix || options.sourceFolder);

    let inflight = [ ];

    while (paths.length) {
        if (inflight.length > MAX_CONNECTIONS) { await Promise.race(inflight); }

        let path = resolve(paths.pop());

        // Read the file contents
        const content = fs.readFileSync(path);

        // Something went wrong, we've crawled out of our folder; bail
        if (!path.startsWith(sourcePrefix)) {
            path = path.substring(sourcePrefix);
        }

        // Compute the S3 key
        const key = join(options.destinationPrefix || ".", relative(sourcePrefix, path));

        // Upload the files
        console.log(` - ${ key } (${ content.length } bytes)`);
        const promise = upload(s3, options.bucket, content, key);

        // Track inflight uploads to prevent too many simultaneous uploads
        inflight.push(promise);
        promise.then(() => {
            inflight = inflight.filter((p) => (p !== promise));
        });
    }

    if (options.cloudfrontId) {
        const result = await cloudfront.send(new CreateInvalidationCommand({
            DistributionId: options.cloudfrontId,
            InvalidationBatch: {
                CallerReference: `sync-s3-flush-${ parseInt(((new Date()).getTime()) / 1000) }`,
                Paths: {
                    Quantity: 1,
                    Items: [ "/\*" ]
                }
            }
        }));

        console.log(`Invalidation Id: ${ result.Invalidation.Id }`);
    }

    return paths;
}

