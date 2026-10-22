import Nat "mo:core/Nat";

// Pure rules for storing module analyses, kept out of main.mo so they can be
// tested with the Motoko interpreter.
module {
  // Alert thresholds on the 0-10 module risk scale. Keep in sync with
  // frontend/src/lib/risk.ts (backend-rules.test.ts checks they agree).
  public let coralAlertThreshold : Float = 6.0;
  public let aisAlertThreshold : Float = 7.0;
  public let iotAlertThreshold : Float = 7.0;

  // Map key for a stored coral analysis. `seq` is a per-canister counter, so
  // repeated analyses of one region are kept instead of overwriting each other.
  public func coralRecordKey(region : Text, seq : Nat) : Text {
    region # "#" # seq.toText();
  };

  public func coralAlertStatus(riskScore : Float) : Bool {
    riskScore >= coralAlertThreshold;
  };

  public func aisAlertStatus(riskScore : Float) : Bool {
    riskScore >= aisAlertThreshold;
  };

  public func iotAlertStatus(riskScore : Float) : Bool {
    riskScore >= iotAlertThreshold;
  };
};
