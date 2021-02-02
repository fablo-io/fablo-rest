import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import pkg from "./package.json";

export default {
  input: pkg.main,
  output: [
    {
      file: pkg.module,
      format: "es",
      sourcemap: true,
      globals: {},
    },
  ],

  plugins: [commonjs(), json(), nodeResolve(), typescript()],
};
