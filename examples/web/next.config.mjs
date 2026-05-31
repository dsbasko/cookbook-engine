// The consumer's entire Next config is the factory call. createCookbookConfig
// reads ../course.yaml via process.cwd() (from inside node_modules), enables
// output:'export', wires transpilePackages for the engine and injects
// brand.siteUrl into NEXT_PUBLIC_SITE_URL.
import { createCookbookConfig } from '@dsbasko/cookbook-engine/config';

export default createCookbookConfig();
