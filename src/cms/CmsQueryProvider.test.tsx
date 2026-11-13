import { render, screen } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { CmsQueryProvider, useCmsAccount } from "./CmsQueryProvider";

function Consumer() {
  const account = useCmsAccount();
  const { data } = useQuery({ queryKey: ["fixture"], queryFn: async () => account, staleTime: Infinity });
  return <p>{data ?? "Loading"}</p>;
}
it("isolates cached results when the account boundary changes", async () => {
  const page = render(<CmsQueryProvider accountId="first"><Consumer /></CmsQueryProvider>);
  await screen.findByText("first");
  page.rerender(<CmsQueryProvider accountId="second"><Consumer /></CmsQueryProvider>);
  expect(screen.queryByText("first")).toBeNull();
  await screen.findByText("second");
});
