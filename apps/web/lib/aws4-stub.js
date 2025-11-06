// Minimal stub for optional aws4 dependency pulled in by mongodb.
// We don't use AWS IAM auth locally, so any unexpected invocation should fail fast.
module.exports = {
  sign() {
    throw new Error("aws4 signing is not available in this environment.");
  },
};
