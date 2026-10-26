import areaData from "./data/area.json" with { type: "json" };
import jobcatData from "./data/jobcat.json" with { type: "json" };
import { SourceError } from "./errors.js";

type RawCodeNode = {
  no: string;
  des: string;
  n?: RawCodeNode[];
};

type CodeEntry = { code: string; name: string };

function flatten(nodes: RawCodeNode[]): CodeEntry[] {
  const entries: CodeEntry[] = [];
  const visit = (node: RawCodeNode): void => {
    if (/^\d+$/.test(node.no) && node.des.trim()) {
      entries.push({ code: node.no, name: node.des.trim() });
    }
    for (const child of node.n ?? []) visit(child);
  };
  for (const node of nodes) visit(node);
  return entries;
}

const areas = flatten(areaData as RawCodeNode[]);
const jobCategories = flatten(jobcatData as RawCodeNode[]);

function resolveNames(names: string[], entries: CodeEntry[], kind: string): string[] {
  return names.map((name) => {
    const exact = entries.find((entry) => entry.name === name);
    if (exact) return exact.code;
    const suggestions = entries
      .filter((entry) => entry.name.includes(name) || name.includes(entry.name))
      .slice(0, 5)
      .map((entry) => entry.name);
    const suffix = suggestions.length > 0 ? `；建議：${suggestions.join("、")}` : "";
    throw new SourceError("INVALID_FILTER", `找不到${kind}「${name}」${suffix}`);
  });
}

export function resolveAreas(names: string[]): string[] {
  return resolveNames(names, areas, "地區");
}

export function resolveJobCategories(names: string[]): string[] {
  return resolveNames(names, jobCategories, "職類");
}
