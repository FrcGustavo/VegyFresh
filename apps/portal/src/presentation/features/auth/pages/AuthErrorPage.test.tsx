import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthErrorPage } from "./AuthErrorPage";

describe("portal authentication errors", () => {
  it("shows a useful recovery path for provider outages", () => {
    const html = renderToStaticMarkup(<AuthErrorPage error="temporarily_unavailable" />);
    expect(html).toContain("temporarily unavailable");
    expect(html).toContain('/session/login');
  });
  it("never displays unrecognized provider data", () => {
    const html = renderToStaticMarkup(<AuthErrorPage error="<script>private-value</script>" />);
    expect(html).not.toContain("private-value");
    expect(html).toContain("could not complete sign-in");
    expect(renderToStaticMarkup(<AuthErrorPage error="__proto__" />)).toContain("could not complete sign-in");
  });
});
