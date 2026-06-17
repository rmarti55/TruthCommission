import type { ContactDiscoveryOptions, ContactDiscoveryResult } from "@truth-commission/ingest";
import { runContactDiscovery } from "@truth-commission/ingest";
import type { Database } from "@truth-commission/db";
import { runLlmStakeholderExtraction } from "./extract-stakeholders-llm";

export async function discoverContacts(
  db: Database,
  options: ContactDiscoveryOptions = {},
): Promise<ContactDiscoveryResult> {
  return runContactDiscovery(db, {
    ...options,
    llmExtractor: options.skipLlm ? undefined : runLlmStakeholderExtraction,
  });
}
