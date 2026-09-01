require('dotenv').config();

const path = require('path');
const { execSync } = require('child_process');

const gulp = require('gulp');
const rename = require('gulp-rename');
const awspublish = require('gulp-awspublish');
const parallelize = require('concurrent-transform');

// ---------------------------------------------------------------------------
// Branch -> S3 folder
//
// REPLACE the two folder names below with the real folders in the bucket.
// Everything else keys off this map: add a branch here and it becomes
// deployable, remove it and deploys from that branch are refused.
// ---------------------------------------------------------------------------
const BRANCH_PREFIX_MAP = {
  dev: 'duda-widgets',
  demo: 'duda-widgets-ssa',
};

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

function currentGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (err) {
    return '';
  }
}

// Supports `gulp upload --target dev` and `--target=dev`.
function targetFromArgv() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--target');
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  const inline = argv.find((a) => a.startsWith('--target='));
  return inline ? inline.slice('--target='.length) : '';
}

function resolveDeployment() {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw fail('AWS_S3_BUCKET is not set. Copy .env.example to .env and fill in the AWS values.');
  }

  const branch = currentGitBranch();

  // S3_PREFIX is the escape hatch: deploy to an arbitrary folder from any
  // branch, bypassing the map entirely.
  if (process.env.S3_PREFIX) {
    return { bucket, branch, target: '(S3_PREFIX override)', prefix: process.env.S3_PREFIX };
  }

  const target = targetFromArgv() || process.env.DEPLOY_TARGET || branch;
  const prefix = BRANCH_PREFIX_MAP[target];

  // Refusing here is the point: a stray `npm run deploy` from a feat/* branch
  // must never silently overwrite the demo folder.
  if (!prefix) {
    throw fail(
      `No S3 folder is mapped for "${target}". ` +
        `Known targets: ${Object.keys(BRANCH_PREFIX_MAP).join(', ')}. ` +
        'Use `npm run deploy:dev` / `npm run deploy:demo`, or set S3_PREFIX=<folder> ' +
        'to deploy somewhere else.',
    );
  }

  return { bucket, branch, target, prefix };
}

gulp.task('upload', function () {
  const { bucket, branch, target, prefix } = resolveDeployment();

  console.log('');
  console.log('  Uploading dist/ to S3');
  console.log(`    branch : ${branch || '(unknown)'}`);
  console.log(`    target : ${target}`);
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

      // Prepend the branch's folder to every key, so dev and demo live side by
      // side in one bucket. dirname is '.' for files at the root of dist/.
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
  const { bucket, branch, target, prefix } = resolveDeployment();
  console.log('');
  console.log('  Deploy target resolved — nothing uploaded yet.');
  console.log(`    branch : ${branch || '(unknown)'}`);
  console.log(`    target : ${target}`);
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
