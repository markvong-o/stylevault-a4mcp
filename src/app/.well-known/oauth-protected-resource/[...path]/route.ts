// RFC 9728: /.well-known/oauth-protected-resource/{path} catch-all
// Serves the same metadata regardless of path suffix.
export { GET, OPTIONS } from "../route";
