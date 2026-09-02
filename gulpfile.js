require('dotenv').config();

const path = require('path');

const gulp = require('gulp');
const rename = require('gulp-rename');
const awspublish = require('gulp-awspublish');
const parallelize = require('concurrent-transform');

// ---------------------------------------------------------------------------
// S3 folder
//
// Every environment uses the SAME folder. What changes per environment is the
// bucket — Jenkins sets AWS_S3_BUCKET per job (dev-website.build.bucket, etc).
// S3_PREFIX overrides this for a one-off deploy elsewhere.
// ---------------------------------------------------------------------------
const S3_PREFIX = process.env.S3_PREFIX || 'duda-widgets';

// Widget bundles are NOT content-hashed (dist/widget-faqs.js keeps that name
// forever), so a long immutable max-age would pin a stale bundle in Duda with
// no way to bust it. 5 minutes keeps deploys effectively instant.
const HEADERS = {
  'Cache-Control': 'public, max-age=300',
};

// Config mistakes are user errors, not crashes — gulp-cli honours showStack:false
// and prints just the message.
function fail(message) {
  const err = new Error(message);
  err.showStack = false;
  return err;
}

function resolveDeployment() {
  // The bucket is the only thing separating environments, so an unset bucket
  // is the one mistake that must never fall through to a default.
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw fail('AWS_S3_BUCKET is not set. Copy .env.example to .env and fill in the AWS values.');
  }

  // Informational only — DEPLOY_TARGET labels the CI log, it does not affect
  // where anything lands. npm run deploy:dev / deploy:demo set it.
  const target = process.env.DEPLOY_TARGET || '(unset)';

  return { bucket, target, prefix: S3_PREFIX };
}

gulp.task('upload', function () {
  const { bucket, target, prefix } = resolveDeployment();

  console.log('');
  console.log('  Uploading dist/ to S3');
  console.log(`    env    : ${target}`);
  console.log(`    bucket : ${bucket}`);
  console.log(`    prefix : ${prefix}/`);
  console.log('');

  const publisher = awspublish.create({
    region: process.env.AWS_REGION || 'us-east-1',
    params: { Bucket: bucket },
  });

  return (
    gulp
      .src('./dist/**/*', { nodir: true, base: './dist' })

      // Prepend the folder to every key. dirname is '.' for files sitting at
      // the root of dist/.
      .pipe(
        rename(function (p) {
          p.dirname = path.posix.join(prefix, p.dirname);
        }),
      )

      // No gzip pass. Duda's require.js fetches widget-x.js by exact name and
      // would never request a sibling widget-x.js.gz; let the CDN compress.
      .pipe(parallelize(publisher.publish(HEADERS), 20))

      // Writes .awspublish-<bucket> so unchanged files are skipped next time.
      .pipe(publisher.cache())

      .pipe(awspublish.reporter())
  );
});

// Prints the resolved target without touching S3. Use this to sanity-check the
// branch mapping before a real deploy.
gulp.task('upload:dry', function (done) {
  const { bucket, target, prefix } = resolveDeployment();
  console.log('');
  console.log('  Deploy target resolved — nothing uploaded yet.');
  console.log(`    env    : ${target}`);
  console.log(`    bucket : ${bucket}`);
  console.log(`    prefix : ${prefix}/`);
  console.log(`    would upload dist/** to s3://${bucket}/${prefix}/`);
  console.log('');
  done();
});

// ---------------------------------------------------------------------------
// Optional: CloudFront invalidation
//
// Not needed while Cache-Control is max-age=300. If the cache window is ever
// lengthened, set CLOUDFRONT_DISTRIBUTION_ID and uncomment this, then change
// the default task to gulp.series('upload', 'invalidate').
// ---------------------------------------------------------------------------
// gulp.task('invalidate', function () {
//   const AWS = require('aws-sdk');
//   const { prefix } = resolveDeployment();
//   const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
//   if (!distributionId) throw new Error('CLOUDFRONT_DISTRIBUTION_ID is not set.');
//
//   return new AWS.CloudFront()
//     .createInvalidation({
//       DistributionId: distributionId,
//       InvalidationBatch: {
//         CallerReference: `widgets-${Date.now()}`,
//         Paths: { Quantity: 1, Items: [`/${prefix}/*`] },
//       },
//     })
//     .promise();
// });

gulp.task('default', gulp.series('upload'));
