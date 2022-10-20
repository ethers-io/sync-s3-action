import core from "@actions/core";

import { syncS3 } from "./sync-s3.js";

syncS3({
    accessKeyId: core.getInput("aws_access_key_id", { required: true }),
    secretAccessKey: core.getInput("aws_secret_access_key", { required: true }),
    s3Bucket: core.getInput("aws_s3_bucket", { required: true }),
    sourceFolder: core.getInput("source_folder", { required: true }),
    sourcePrefix: core.getInput("source_prefix", { required: false }),
    destinationPrefix: core.getInput("destination_prefix", { required: false }),
    cloudfrontId: core.getInput("aws_cloudfront_id", { required: false }),
}).then((keys) => {
    keys.forEach((key) => { code.info(key); });
    core.setOutput("object_keys", keys);
}).catch((error) => {
    core.error(error);
    core.setFailed(error.message);
});
