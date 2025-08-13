import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Wifi, Camera, Globe, Video, Clock, CheckCircle, Printer, Send, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

interface SuccessScreenProps {
  guestInfo: {
    capsuleNumber?: string;
    autoAssign?: boolean;
    guestName: string;
    phoneNumber: string;
    email?: string;
    expectedCheckoutDate?: string;
    position: string;
  } | null;
  settings: any;
  assignedCapsuleNumber: string | null;
  capsuleIssues: any[];
  canEdit: boolean;
  editExpiresAt: Date | null;
  editToken: string;
  showEmailDialog: boolean;
  setShowEmailDialog: (show: boolean) => void;
  emailForSlip: string;
  setEmailForSlip: (email: string) => void;
  handlePrint: () => void;
  handleSaveAsPdf: () => void;
  handleSendEmail: () => void;
}

export default function SuccessScreen({
  guestInfo,
  settings,
  assignedCapsuleNumber,
  capsuleIssues,
  canEdit,
  editExpiresAt,
  editToken,
  showEmailDialog,
  setShowEmailDialog,
  emailForSlip,
  setEmailForSlip,
  handlePrint,
  handleSaveAsPdf,
  handleSendEmail,
}: SuccessScreenProps) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="shadow-xl">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">🎉</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.goodDay}</h1>
              <div className="text-2xl mb-4">🎉</div>
            </div>

            <div className="bg-gradient-to-r from-orange-100 to-pink-100 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-2">
                {t.welcomeHostel} <span className="text-2xl">🌈</span>
              </h2>
              
              {/* Essential Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* Address Section */}
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-orange-600 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-800 mb-1">Address</div>
                      <div className="text-gray-700 whitespace-pre-line text-xs">
                        {settings?.guideAddress || '26A, Jalan Perang, Taman Pelangi, 80400 Johor Bahru, Johor, Malaysia'}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* WiFi Section */}
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <Wifi className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-800 mb-1">WiFi Access</div>
                      <div className="text-gray-700 text-xs">
                        <div><span className="font-medium">Network:</span> {settings?.guideWifiName || 'Pelangi_Guest'}</div>
                        <div><span className="font-medium">Password:</span> {settings?.guideWifiPassword || 'Pelangi2024!'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {settings?.guideHostelPhotosUrl && (
                <Button variant="outline" className="flex items-center gap-2 h-auto py-3 px-4" onClick={() => window.open(settings.guideHostelPhotosUrl, '_blank')}>
                  <Camera className="h-4 w-4" />
                  <span className="text-sm">{t.hostelPhotos}</span>
                </Button>
              )}
              {settings?.guideGoogleMapsUrl && (
                <Button variant="outline" className="flex items-center gap-2 h-auto py-3 px-4" onClick={() => window.open(settings.guideGoogleMapsUrl, '_blank')}>
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">{t.googleMaps}</span>
                </Button>
              )}
              {settings?.guideCheckinVideoUrl && (
                <Button variant="outline" className="flex items-center gap-2 h-auto py-3 px-4" onClick={() => window.open(settings.guideCheckinVideoUrl, '_blank')}>
                  <Video className="h-4 w-4" />
                  <span className="text-sm">{t.checkInVideo}</span>
                </Button>
              )}
              {!settings?.guideHostelPhotosUrl && !settings?.guideGoogleMapsUrl && !settings?.guideCheckinVideoUrl && (
                <div className="col-span-3 text-center text-gray-500 text-sm py-4">
                  Quick links not configured
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 py-6 space-y-4">
              {/* Time Information */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Check-in & Check-out Times
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">🕒</span>
                    <span className="font-medium">Check-in:</span>
                    <span className="font-semibold">{settings?.guideCheckinTime || '2:00 PM'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">🕛</span>
                    <span className="font-medium">Check-out:</span>
                    <span className="font-semibold">{settings?.guideCheckoutTime || '12:00 PM'}</span>
                  </div>
                </div>
              </div>

              {/* Access Information */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Access & Room Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">🔐</span>
                    <span className="font-medium">Door Password:</span>
                    <span className="font-mono text-lg font-bold text-green-600 bg-white px-2 py-1 rounded border">
                      {settings?.guideDoorPassword || '1270#'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">🛌</span>
                    <span className="font-medium">Capsule:</span>
                    <span className="font-bold text-lg text-orange-600 bg-white px-2 py-1 rounded border">
                      {assignedCapsuleNumber || guestInfo?.capsuleNumber || 'Assigned based on availability'}
                    </span>
                  </div>
                </div>
                                    <div className="flex items-center gap-2">
                    <span className="text-green-600">🃏</span>
                    <span className="font-medium">Access Card:</span>
                    <span className="text-sm text-gray-600">Collect from reception upon arrival</span>
                  </div>
                  
                  {/* Capsule Issues Display */}
                  {settings?.guideShowCapsuleIssues !== false && capsuleIssues.length > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-yellow-600">⚠️</span>
                        <span className="font-medium text-yellow-800">Capsule Issues</span>
                      </div>
                      <div className="space-y-2">
                        {capsuleIssues.map((issue, index) => (
                          <div key={index} className="text-sm text-yellow-700 bg-white/60 p-2 rounded border">
                            <div className="font-medium">{issue.description}</div>
                            <div className="text-xs text-yellow-600 mt-1">
                              Reported: {new Date(issue.reportedAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-yellow-700">
                        <strong>Note:</strong> These issues have been reported and are being addressed. 
                        You may choose to accept this capsule or contact reception for alternatives.
                      </div>
                    </div>
                  )}
              </div>

              {/* Important Reminders */}
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                  <span className="text-red-600">⚠️</span> 
                  Important Reminders
                </h3>
                <div className="text-sm text-red-700 whitespace-pre-wrap leading-relaxed">
                  {settings?.guideImportantReminders || 'Please keep your room key safe. Quiet hours are from 10:00 PM to 7:00 AM. No smoking inside the building. Keep shared spaces clean.'}
                </div>
              </div>

              {canEdit && editExpiresAt && new Date() < editExpiresAt && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-yellow-800">{t.infoEditable}</span>
                  </div>
                  <p className="text-xs text-yellow-700">
                    {t.editUntil} {editExpiresAt.toLocaleTimeString()}.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => {
                      // Navigate back to edit form
                      window.location.href = `/guest-edit?token=${editToken}`;
                    }}
                  >
                    {t.editMyInfo}
                  </Button>
                </div>
              )}

              {/* Print, Email, and Save buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  {t.printCheckInSlip}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEmailForSlip(guestInfo?.email || "");
                    setShowEmailDialog(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Email
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveAsPdf}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t.saveAsPdf}
                </Button>
              </div>

              <div className="text-center text-gray-600 text-sm">
                {t.assistance} <br />
                {t.enjoyStay}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.sendCheckInSlipEmail}</DialogTitle>
            <DialogDescription>
              {t.enterEmailForSlip}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="email-slip">{t.emailAddress}</Label>
              <Input
                id="email-slip"
                type="email"
                placeholder="your.email@example.com"
                value={emailForSlip}
                onChange={(e) => setEmailForSlip(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowEmailDialog(false)}
              >
                {t.cancel}
              </Button>
              <Button
                onClick={handleSendEmail}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}