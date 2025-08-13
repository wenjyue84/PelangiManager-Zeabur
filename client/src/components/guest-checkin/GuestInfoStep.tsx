import { User, Phone, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { GuestSelfCheckin } from "@shared/schema";
import { ValidationHelpers } from "./shared/ValidationHelpers";
import { NATIONALITIES } from "@/lib/nationalities";

interface GuestInfoStepProps {
  form: UseFormReturn<GuestSelfCheckin>;
  errors: Record<string, any>;
  t: any;
  nationalityFilter: string;
  setNationalityFilter: (filter: string) => void;
}

export function GuestInfoStep({ 
  form, 
  errors, 
  t, 
  nationalityFilter, 
  setNationalityFilter 
}: GuestInfoStepProps) {
  const filteredNationalities = NATIONALITIES.filter(nationality =>
    nationality.label.toLowerCase().includes(nationalityFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
          <User className="mr-2 h-4 w-4" />
          {t.personalInfo}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="nameAsInDocument" className="text-sm font-medium text-hostel-text">
              {t.fullNameLabel}
            </Label>
            <Input
              id="nameAsInDocument"
              type="text"
              placeholder={t.fullNamePlaceholder}
              className="w-full mt-1"
              autoComplete="name"
              {...form.register("nameAsInDocument")}
            />
            <ValidationHelpers 
              errors={errors} 
              fieldName="nameAsInDocument" 
              hint={t.nameHint} 
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="phoneNumber" className="text-sm font-medium text-hostel-text flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {t.contactNumberLabel}
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder={t.contactNumberPlaceholder}
              className="w-full mt-1"
              autoComplete="tel"
              inputMode="tel"
              {...form.register("phoneNumber")}
            />
            <ValidationHelpers 
              errors={errors} 
              fieldName="phoneNumber" 
              hint={t.phoneHint} 
            />
          </div>
          
          <div>
            <Label htmlFor="gender" className="text-sm font-medium text-hostel-text">
              {t.genderLabel}
            </Label>
            <Select
              value={form.watch("gender") || ""}
              onValueChange={(value) => form.setValue("gender", value as "male" | "female" | "other" | "prefer-not-to-say")}
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder={t.genderPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t.male}</SelectItem>
                <SelectItem value="female">{t.female}</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
            <ValidationHelpers 
              errors={errors} 
              fieldName="gender" 
              hint={t.genderHint} 
            />
          </div>
          
          <div>
            <Label htmlFor="nationality" className="text-sm font-medium text-hostel-text">
              {t.nationalityLabel}
            </Label>
            <div className="space-y-2">
              <Input
                placeholder="Search nationality..."
                value={nationalityFilter}
                onChange={(e) => setNationalityFilter(e.target.value)}
                className="w-full"
              />
              <Select
                defaultValue="Malaysian"
                onValueChange={(value) => form.setValue("nationality", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select nationality" />
                </SelectTrigger>
                <SelectContent>
                  {filteredNationalities.map((nationality) => (
                    <SelectItem key={nationality.value} value={nationality.value}>
                      {nationality.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ValidationHelpers 
              errors={errors} 
              fieldName="nationality" 
              hint={t.nationalityHint} 
            />
          </div>
        </div>
      </div>

      {/* Check-in & Check-out Dates */}
      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
        <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
          <Calendar className="mr-2 h-4 w-4" />
          Check-in & Check-out Dates
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="checkInDate" className="text-sm font-medium text-hostel-text">
              Check-in Date <span className="text-gray-500 text-xs">(Editable)</span>
            </Label>
            <Input
              id="checkInDate"
              type="date"
              className="w-full mt-1"
              {...form.register("checkInDate")}
            />
            <p className="text-xs text-gray-500 mt-1">
              Default is today's date. You can change this if you plan to arrive on a different date.
            </p>
            <ValidationHelpers 
              errors={errors} 
              fieldName="checkInDate" 
            />
          </div>
          
          <div>
            <Label htmlFor="checkOutDate" className="text-sm font-medium text-hostel-text">
              Check-out Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="checkOutDate"
              type="date"
              className="w-full mt-1"
              required
              {...form.register("checkOutDate", { required: "Check-out date is required" })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Please select your planned check-out date.
            </p>
            <ValidationHelpers 
              errors={errors} 
              fieldName="checkOutDate" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
