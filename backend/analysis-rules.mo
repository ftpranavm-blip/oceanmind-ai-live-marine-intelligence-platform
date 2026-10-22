import Nat "mo:core/Nat";

// Pure rules for storing module analyses, kept out of main.mo so they can be
// tested with the Motoko interpreter.
module {
  // Map key for a stored coral analysis. `seq` is a per-canister counter.
  public func coralRecordKey(region : Text, _seq : Nat) : Text {
    region;
  };

  public func coralAlertStatus(_riskScore : Float) : Bool {
    false;
  };

  public func aisAlertStatus(_riskScore : Float) : Bool {
    false;
  };

  public func iotAlertStatus(_riskScore : Float) : Bool {
    false;
  };
};
