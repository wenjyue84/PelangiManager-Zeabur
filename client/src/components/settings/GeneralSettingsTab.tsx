import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Clock, Save, RotateCcw } from "lucide-react";

export default function GeneralSettingsTab({ settings, isLoading, form, onSubmit, resetToDefault, updateSettingsMutation }: any) {
  return (
    <div className="grid grid-cols-1 gap-6">
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse w-32"></div>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Accommodation Term Pane */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-purple-600" />
                  Accommodation Terminology
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name={"accommodationType" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accommodation Term</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="max-w-xs">
                          <SelectValue placeholder="Select term" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="capsule">Capsule</SelectItem>
                          <SelectItem value="room">Room</SelectItem>
                          <SelectItem value="house">House</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-sm text-gray-600">
                        This term will be used across the system (e.g., Check-in forms, Maintenance, Dashboard).
                      </div>
                      <div className="text-sm text-gray-500 mt-2 space-y-1">
                        <div className="font-medium">Affected areas:</div>
                        <ol className="list-decimal list-inside space-y-1 ml-2 text-xs">
                          <li>Dashboard page &gt; Occupancy Cards &amp; Table</li>
                          <li>Guest Check-in page &gt; Assignment field</li>
                          <li>Guest Check-out page &gt; Entity selector</li>
                          <li>Cleaning page &gt; Status indicators</li>
                          <li>Maintenance pages &gt; Problem tables</li>
                          <li>Guest Details modal &gt; Summary fields</li>
                          <li>Dashboard/Guests table &gt; Column headers</li>
                          <li>Notifications &gt; Entity references</li>
                          <li>Token generation &gt; Field labels</li>
                          <li>Settings &gt; General configuration</li>
                        </ol>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Guest Check-In Settings Pane */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Guest Check-In Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="guestTokenExpirationHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Expiration Time</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="168"
                            placeholder="24"
                            className="max-w-xs"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <span className="text-sm text-gray-500">hours</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        How long guest check-in tokens remain valid after creation.
                        <br />
                        <span className="text-xs text-gray-500">
                          Range: 1-168 hours (1 hour to 7 days)
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button
                    type="submit"
                    disabled={updateSettingsMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetToDefault}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset to Default (24h)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Current Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Token Validity</p>
                      <p className="text-xs text-gray-500">Time before tokens expire</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-blue-600">
                        {settings?.guestTokenExpirationHours || 24}h
                      </p>
                      <p className="text-xs text-gray-500">
                        {settings?.guestTokenExpirationHours === 24 ? "Default" : "Custom"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Edit Window</p>
                      <p className="text-xs text-gray-500">After guest completes check-in</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-600">1h</p>
                      <p className="text-xs text-gray-500">Fixed</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      )}
    </div>
  );
}