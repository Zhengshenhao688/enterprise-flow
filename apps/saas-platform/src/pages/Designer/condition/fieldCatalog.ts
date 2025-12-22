// src/pages/Designer/condition/fieldCatalog.ts
export type FieldOption = {
  label: string;   // 给人看的
  path: string;    // 给引擎/存储用的：from.amount
  type?: "number" | "string" | "boolean" | "date";
};

export const FIELD_CATALOG: FieldOption[] = [
  { label: "金额", path: "form.amount", type: "number" },
  { label: "天数", path: "form.days", type: "number" },
  { label: "部门", path: "form.department", type: "string" },
];