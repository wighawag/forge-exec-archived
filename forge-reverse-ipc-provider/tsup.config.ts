import {defineConfig} from 'tsup';
import fs from 'node:fs';

export default defineConfig({
	async onSuccess() {
		fs.writeFileSync('dist/cjs/package.json', `{"type": "commonjs"}`);
		fs.writeFileSync('dist/esm/package.json', `{"type": "module"}`);
	},
});
