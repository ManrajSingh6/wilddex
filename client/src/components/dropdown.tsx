import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownSelectProps {
  options: readonly DropdownOption[];
  selectedOption: DropdownOption;
  setSelectedOption: (optionValue: string) => void;
  label?: string;
}

export default function DropdownSelect({
  options,
  selectedOption,
  setSelectedOption,
  label,
}: DropdownSelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-sm font-normal text-foreground text-left">
          {label}
        </label>
      )}
      <Select
        value={selectedOption.value}
        onValueChange={(opt) => setSelectedOption(opt)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
