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
  collection: "publications" | "projects";
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
}) {
  return (
    <CmsToolbar actions={
      <Select value={status} onChange={(next) => {
        if (next === "all" || next === "published" || next === "draft") onStatusChange(next);
      }} className="w-full sm:w-44">
        <Label className="text-sm font-medium">Status</Label>
        <Select.Trigger className={`${fieldClassName} h-12 sm:text-sm`}>
          <Select.Value /><Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="all" textValue={`All ${collection}`}>All {collection}<ListBox.ItemIndicator /></ListBox.Item>
            <ListBox.Item id="published" textValue="Published">Published<ListBox.ItemIndicator /></ListBox.Item>
            <ListBox.Item id="draft" textValue="Drafts">Drafts<ListBox.ItemIndicator /></ListBox.Item>
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
        <Label className="text-sm font-medium">Search {collection}</Label>
        <Input type="search" className="h-12" startContent={<Search aria-hidden="true" />} />
      </TextField>
    </CmsToolbar>
  );
}
