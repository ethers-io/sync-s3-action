Sync S3
=======

This action syncs a folder to an S3 Bucket, uploading only files which have
changed and optionally invalidates any Cloudfront edge caches.

Configuration
-------------

**workflow.yml**

```
name: Sync to S3

on:
  push:
    bracnhes:
      - master

jobs:

  sync-website:
    name: Sync Website to S3

    runs-on: ubuntu-latest

    steps:
      - name: Use Node.js 16.x
        uses: actions/setup-node@v1
        with:
          node-version: 16.x

      - name: Checkout repository
        uses: actions/checkout@v2

      - name: Sync to S3
        uses: ethers-io/sync-s3-action
        with:
          aws_access_key_id: ${{ secrets.AWS_KEY_ID }}
          aws_secret_access_key: ${{ secrets.AWS_SECRET_ACCESS_KEY}}
          aws_s3_bucket: ${{ secrets.AWS_BUCKET }}
          source_folder: 'foo/bar/'
          source_prefix: 'foo/'
          destination-prefix: 'another-foo/'
          aws_cloudfront_id: ZQWX4KGLS45
```

**IAM Permissions**

You must substitute your own ARN for the CloudFront and S3 resources.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObjectAcl",
                "s3:GetObject",
                "s3:PutObjectVersionAcl",
                "s3:ListBucket",
                "cloudfront:CreateInvalidation",
                "s3:PutObjectAcl"
            ],
            "Resource": [
                "arn:aws:cloudfront::USER_ID:distribution/DISTRIBUTION_ID",
                "arn:aws:s3:::your.bucket.here",
                "arn:aws:s3:::your.bucket.here/*"
            ]
        }
    ]
}
```

License
-------

MIT License.
