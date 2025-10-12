interface ImportMetaEnv {
	VITE_GITHUB_OWNER?: string;
	VITE_GITHUB_REPO?: string;
	VITE_GITHUB_BRANCH?: string;
	VITE_GITHUB_PATH?: string;
	VITE_GITHUB_TOKEN?: string;
}

interface ImportMeta {
	env: ImportMetaEnv;
}
/// <reference types="vite/client" />
