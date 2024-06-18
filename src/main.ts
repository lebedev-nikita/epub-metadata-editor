#!/usr/bin/env -S deno run -A --ext ts

import * as cli from "jsr:@std/cli@0.224.7";
import * as path from "jsr:@std/path@0.225.0";
import { XMLBuilder, XMLParser } from "npm:fast-xml-parser@4.4.0";
import { z } from "npm:zod@3.23.8";
import { $ } from "npm:zx@8.0.2";

const args = parseArgs();
const file = args._[0];

const inputExt = path.extname(file);

if (inputExt != ".epub") {
  throw new Error(`wrong file extension: '${inputExt}' (expected '.epub')`);
}

const tmpdir = `/tmp/epub-${Date.now()}`;
const metadataFile = path.resolve(tmpdir, "content.opf");

await $`mkdir ${tmpdir}`;
await $`unzip ${file} -d ${tmpdir}`;

const xml = await Deno.readTextFile(metadataFile);
const result = addMetadata(xml);
await Deno.writeTextFile(metadataFile, result);

await $`cd ${tmpdir} && zip -r ${file} ./*`;
await $`rm -r ${tmpdir}`;

function addMetadata(xml: string): string {
  const xmlObj = new XMLParser({ ignoreAttributes: false }).parse(xml);
  xmlObj.package.metadata["dc:creator"] = args.creator;
  xmlObj.package.metadata["dc:title"] = args.title;
  return new XMLBuilder({ ignoreAttributes: false }).build(xmlObj);
}

function parseArgs() {
  const ArgsSchema = z.object({
    _: z.tuple([z.string()]),
    title: z.string(),
    creator: z.string(),
  });
  return ArgsSchema.parse(cli.parseArgs(Deno.args));
}
