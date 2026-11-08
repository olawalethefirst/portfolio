"use client";

import { Label, TextField } from "@heroui/react";
import { Search } from "lucide-react";
import { Select } from "@heroui/react/select";
import { ListBox } from "@heroui/react/list-box";
import { Input } from "@/src/components/ui/Input";
import { fieldClassName } from "@/src/components/ui/field-styles";
import { CmsToolbar } from "./CmsLayout";

export function CmsCollectionToolbar({
  collection,
  search,
  onSearchChange,
  status,
  onStatusChange,
}: {
  collection: "publications" | "projects" | "seo";
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
}) {
  const statuses = collection === "seo"
    ? [{ value: "all", label: "All paths" }, { value: "custom", label: "Custom" }, { value: "inherited", label: "Inherited" }]
    : [{ value: "all", label: `All ${collection}` }, { value: "published", label: "Published" }, { value: "draft", label: "Drafts" }];
  return (
    <CmsToolbar actions={
      <Select value={status} onChange={(next) => {
        if (typeof next === "string" && statuses.some((option) => option.value === next)) onStatusChange(next);
      }} className="w-full sm:w-44">
        <Label className="text-sm font-medium">Status</Label>
        <Select.Trigger className={`${fieldClassName} h-12 sm:text-sm`}>
          <Select.Value /><Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {statuses.map((option) => <ListBox.Item key={option.value} id={option.value} textValue={option.label}>{option.label}<ListBox.ItemIndicator /></ListBox.Item>)}
          </ListBox>
        </Select.Popover>
      </Select>
    }>
      <TextField
        name="search"
        value={search}
        onChange={onSearchChange}
        className="flex w-full flex-col gap-1 sm:w-80"
      >
        <Label className="text-sm font-medium">Search {collection === "seo" ? "SEO paths" : collection}</Label>
        <Input type="search" className="h-12" startContent={<Search aria-hidden="true" />} />
      </TextField>
    </CmsToolbar>
  );
}
