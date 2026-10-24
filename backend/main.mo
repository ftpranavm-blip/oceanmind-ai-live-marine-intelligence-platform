import Time "mo:core/Time";
import Text "mo:core/Text";
import Map "mo:core/Map";
import Array "mo:core/Array";
import List "mo:core/List";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Principal "mo:core/Principal";
import Float "mo:core/Float";
import Migration "migration";
import AnalysisRules "analysis-rules";
import Ownership "ownership";
import Runtime "mo:core/Runtime";

// Explicit data migration to restore stable persistent state.
(with migration = Migration.run)
actor {
  include MixinStorage();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type RiskSource = {
    source : Text;
    value : Float;
  };

  public type FusionCorrelations = {
    satelliteAIS : Float;
    satelliteCoral : Float;
    iotCoral : Float;
    coralAIS : Float;
    mapAIS : Float;
    iotAIS : Float;
    mapCoral : Float;
    mapIot : Float;
    iotSatellite : Float;
    parameters : Text;
  };

  public type FusionThresholds = {
    illegalFishing : Float;
    pollutionCorrelation : Float;
    reefEmergency : Float;
    criticalZone : Float;
    satAisMinRisk : Float;
    pollutionMinRisk : Float;
    coralRisingThermalStress : Float;
    iotHighTemp : Float;
    iotLowOxygen : Float;
    pollutionCriticalMultiMod : Float;
    overallFusionSeverity : Float;
    globalFusionThreshold : Float;
  };

  public type FusionAlert = {
    id : Text;
    region : Text;
    moduleType : Text;
    source : Text;
    analysisType : Text;
    coordinates : Text;
    riskType : Text;
    detectionType : Text;
    type_ : Text;
    alertType : Text;
    severity : Nat;
    correlationType : ?Text;
    consolidationType : ?Text;
    genesisType : ?Text;
    riskScore : Float;
    correlationScore : Float;
    fusionScore : Float;
    consolidationScore : Float;
    totalScore : Float;
    thresholds : ?FusionThresholds;
    nearbyRiskSources : ?[RiskSource];
    riskSources : ?[RiskSource];
    correlations : ?FusionCorrelations;
    satelliteRiskScore : ?Float;
    aisRiskScore : ?Float;
    oceanMapRiskScore : ?Float;
    coralRiskScore : ?Float;
    iotRiskScore : ?Float;
    fusionRiskScore : ?Float;
    globalRiskScore : ?Float;
    globalSeverity : Nat;
    totalRiskScore : ?Float;
    riskLevel : ?Text;
    correlationLevel : ?Text;
    consolidationLevel : ?Text;
    fusionScoreLevel : ?Text;
    combinedRiskLevel : ?Text;
    integratedLevel : ?Text;
    globalRiskLevel : ?Text;
    globalSeverityLevel : ?Text;
    globalSeverityScore : ?Float;
    detailedRiskSources : ?[RiskSource];
    primaryRiskSource : ?Text;
    generatingModule : ?Text;
    detectionSource : ?Text;
    alertOrigin : ?Text;
    isPersistent : Bool;
    timestamp : Time.Time;
    owner : Principal;
    updated : Time.Time;
    sourceModule : Text;
  };

  public type UserProfile = {
    name : Text;
    organization : ?Text;
    role : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view profiles");
    };
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile unless you are an admin");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public type Region = {
    id : Text;
    name : Text;
    coordinates : [(Float, Float)];
  };

  public type RiskScore = {
    value : Float;
    source : Text;
    timestamp : Time.Time;
    owner : Principal;
  };

  public type Alert = {
    id : Text;
    type_ : Text;
    severity : Nat;
    source : ?Text;
    timestamp : Time.Time;
    owner : Principal;
  };

  // Satellite Intelligence
  public type SatelliteAnalysis = {
    id : Text;
    region : Text;
    sourceSentinel1 : Bool;
    sourceSentinel2 : Bool;
    sourceLandsat : Bool;
    sourceModis : Bool;
    vesselCount : Nat;
    clusterFlag : Bool;
    pollutionFlag : Bool;
    nearCoral : Bool;
    marina_area_flag : Bool;
    riskScore : Float;
    timestamp : Time.Time;
    owner : Principal;
  };

  // Enhanced Coral Intelligence
  public type CoralAnalysis = {
    imageId : ?Text;
    bleachingProbability : Float;
    thermalStress : Float;
    riskScore : Float;
    alertStatus : Bool;
    region : Text;
    dataType : Text;
    timestamp : Time.Time;
    owner : Principal;
  };

  // AIS Intelligence
  public type AISAnalysis = {
    id : Text;
    dataModule : Text;
    region : Text;
    vesselIDs : [Text];
    riskScore : Float;
    alertStatus : Bool;
    timestamp : Time.Time;
    owner : Principal;
  };

  public type AISData = {
    id : Text;
    csvBlob : ?Storage.ExternalBlob;
    riskScore : Float;
    owner : Principal;
  };

  // IoT Ocean Intelligence
  public type IoTAnalysis = {
    id : Text;
    dataModule : Text;
    region : Text;
    dataType : Text;
    riskScore : Float;
    alertStatus : Bool;
    timestamp : Time.Time;
    owner : Principal;
  };

  public type IoTData = {
    id : Text;
    csvBlob : ?Storage.ExternalBlob;
    riskScore : Float;
    owner : Principal;
  };

  public type SatelliteAPIConfig = {
    apiKey : Text;
    endpoint : Text;
    authorizedUsers : [Principal];
  };

  public type CoralAPIConfig = {
    apiKey : Text;
    endpoint : Text;
    authorizedUsers : [Principal];
  };

  public type PublicConfig = {
    satelliteAPI : SatelliteAPIConfig;
    coralAPI : CoralAPIConfig;
  };

  public type Coordinate = {
    lat : Float;
    lng : Float;
  };

  public type VesselData = {
    id : Text;
    name : Text;
    type_ : Text;
    mmsi : Text;
    coordinates : Coordinate;
    speed : Float;
    riskScore : Float;
    riskLevel : Text;
    lastUpdated : Time.Time;
    motionDirection : Float;
    heading : Float;
  };

  public type OceanParameter = {
    location : Coordinate;
    temp : Float;
    curr : { speed : Float; direction : Float };
    pollution : Float;
  };

  public type MapData = {
    vessels : [VesselData];
    tempOverlays : [OceanParameter];
    currOverlays : [OceanParameter];
    pollutionOverlays : [OceanParameter];
  };

  public type FusionData = {
    regions : ?[Region];
    satelliteRisk : ?Float;
    coralRisk : ?Float;
    aisRisk : ?Float;
    iotRisk : ?Float;
    oceanMapRisk : ?Float;
    fusionRiskScore : ?Float;
    globalRiskScore : ?Float;
    alerts : ?[FusionAlert];
    vesselCount : ?Nat;
    vesselPositions : ?[?VesselData];
    overlays : ?[OceanParameter];
    correlations : ?FusionCorrelations;
  };

  public type AIRecommendations = {
    id : Text;
    snapshotId : Text;
    situationSummary : Text;
    riskAssessment : RiskAssessment;
    actionableSteps : [ActionStep];
    responsibleStakeholders : [Stakeholder];
    confidenceLevels : [ConfidenceLevel];
    timestamp : Time.Time;
    owner : Principal;
  };

  public type RiskAssessment = {
    severityLevel : Text;
    confidenceScore : Float;
    riskType : Text;
    overallRisk : Text;
  };

  public type ActionStep = {
    action : Text;
    description : Text;
    priority : Text;
  };

  public type Stakeholder = {
    name : Text;
    type_ : Text;
    contactInfo : Text;
  };

  public type ConfidenceLevel = {
    category : Text;
    value : Float;
    indicator : Text;
  };

  public type FusionAnalysisRecord = {
    id : Text;
    timestamp : Time.Time;
    correlations : FusionCorrelations;
    fusionRiskScore : Float;
    globalRiskScore : Float;
    alertsGenerated : Nat;
    owner : Principal;
    aiRecommendations : ?AIRecommendations;
  };

  let regions = Map.empty<Text, Region>();
  let riskScores = Map.empty<Text, RiskScore>();
  let alerts = Map.empty<Text, Alert>();
  let satelliteAnalyses = Map.empty<Text, SatelliteAnalysis>();
  let coralAnalyses = Map.empty<Text, CoralAnalysis>();
  var nextCoralSeq : Nat = 0;
  let aisAnalyses = Map.empty<Text, AISAnalysis>();
  let iotAnalyses = Map.empty<Text, IoTAnalysis>();
  let aisData = Map.empty<Text, AISData>();
  let iotData = Map.empty<Text, IoTData>();
  let fusionAlerts = Map.empty<Text, FusionAlert>();
  let fusionAnalysisHistory = Map.empty<Text, FusionAnalysisRecord>();

  var _publicConfig : ?PublicConfig = null;
  let vessels = Map.empty<Text, VesselData>();
  let oceanParameters = Map.empty<Nat, OceanParameter>();

  // Fusion thresholds configuration
  var fusionThresholds : FusionThresholds = {
    illegalFishing = 0.7;
    pollutionCorrelation = 0.65;
    reefEmergency = 0.75;
    criticalZone = 0.8;
    satAisMinRisk = 0.6;
    pollutionMinRisk = 0.5;
    coralRisingThermalStress = 0.7;
    iotHighTemp = 0.6;
    iotLowOxygen = 0.65;
    pollutionCriticalMultiMod = 0.7;
    overallFusionSeverity = 0.75;
    globalFusionThreshold = 0.65;
  };

  func callerIsAdmin(caller : Principal) : Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // Traps if `id` already holds a record that `caller` may not overwrite.
  func requireWritable(existing : ?{ owner : Principal }, caller : Principal) {
    if (not Ownership.mayWrite(existing, caller, callerIsAdmin(caller))) {
      Runtime.trap("Unauthorized: A record with this id belongs to another user");
    };
  };

  // Method to get map data
  public query ({ caller }) func getMapData() : async MapData {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access map data");
    };

    let vessels = [
      {
        id = "186b01fc-290d-424e-b2c7-5c283140dafd";
        name = "Aqua Voyager";
        type_ = "Cargo";
        mmsi = "248192000";
        coordinates = { lat = 37.7749; lng = -122.4194 };
        speed = 12.5;
        riskScore = 0.2;
        riskLevel = "Low";
        lastUpdated = 1717344000;
        motionDirection = 90.0;
        heading = 100.0;
      },
      {
        id = "fcc05c2b-dfca-4d74-bc0c-1665bfbf71aa";
        name = "Coral Explorer";
        type_ = "Fishing";
        mmsi = "355018000";
        coordinates = { lat = -33.9249; lng = 18.4241 };
        speed = 8.3;
        riskScore = 0.45;
        riskLevel = "Medium";
        lastUpdated = 1717344000;
        motionDirection = 120.0;
        heading = 130.0;
      },
      {
        id = "4bb7b0ee-bab1-41bb-b694-86bad5ae2f1d";
        name = "Ocean Guardian";
        type_ = "Tanker";
        mmsi = "538005251";
        coordinates = { lat = 34.0522; lng = -118.2437 };
        speed = 15.0;
        riskScore = 0.75;
        riskLevel = "High";
        lastUpdated = 1717344000;
        motionDirection = 75.0;
        heading = 80.0;
      },
      {
        id = "681e8238-5e59-4f9e-942c-d8c47b8c23e8";
        name = "Sea Explorer";
        type_ = "Cargo";
        mmsi = "311000267";
        coordinates = { lat = 51.5074; lng = -0.1278 };
        speed = 9.8;
        riskScore = 0.62;
        riskLevel = "Elevated";
        lastUpdated = 1717344000;
        motionDirection = 195.0;
        heading = 200.0;
      },
      {
        id = "c2b7b1e8-4e59-4f9e-942c-d8c47b8c23e8";
        name = "Deep Blue";
        type_ = "General Cargo";
        mmsi = "636013860";
        coordinates = { lat = 25.276987; lng = 55.296249 };
        speed = 10.4;
        riskScore = 0.28;
        riskLevel = "Low";
        lastUpdated = 1717344000;
        motionDirection = 135.0;
        heading = 140.0;
      },
    ];

    let oceanParams = [
      {
        location = { lat = 37.7749; lng = -122.4194 };
        temp = 16.7;
        curr = { speed = 2.5; direction = 90.0 };
        pollution = 0.2;
      },
      {
        location = { lat = -33.9249; lng = 18.4241 };
        temp = 21.3;
        curr = { speed = 3.0; direction = 120.0 };
        pollution = 0.4;
      },
      {
        location = { lat = 34.0522; lng = -118.2437 };
        temp = 18.2;
        curr = { speed = 1.8; direction = 75.0 };
        pollution = 0.7;
      },
      {
        location = { lat = 51.5074; lng = -0.1278 };
        temp = 13.5;
        curr = { speed = 4.2; direction = 195.0 };
        pollution = 0.15;
      },
      {
        location = { lat = 25.276987; lng = 55.296249 };
        temp = 25.0;
        curr = { speed = 2.1; direction = 135.0 };
        pollution = 0.38;
      },
    ];

    {
      vessels = vessels;
      tempOverlays = oceanParams;
      currOverlays = oceanParams;
      pollutionOverlays = oceanParams;
    };
  };

  // New endpoints for real-time analysis history

  // Return success confirmation for real-time cache invalidation
  public shared ({ caller }) func saveSatelliteAnalysis(
    id : Text,
    region : Text,
    sourceSentinel1 : Bool,
    sourceSentinel2 : Bool,
    sourceLandsat : Bool,
    sourceModis : Bool,
    vesselCount : Nat,
    clusterFlag : Bool,
    pollutionFlag : Bool,
    nearCoral : Bool,
    marina_area_flag : Bool,
    riskScore : Float,
  ) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can save satellite analyses");
    };

    let analysis : SatelliteAnalysis = {
      id;
      region;
      sourceSentinel1;
      sourceSentinel2;
      sourceLandsat;
      sourceModis;
      vesselCount;
      clusterFlag;
      pollutionFlag;
      nearCoral;
      marina_area_flag;
      riskScore;
      timestamp = Time.now();
      owner = caller;
    };

    requireWritable(satelliteAnalyses.get(id), caller);
    satelliteAnalyses.add(id, analysis);
    true;
  };

  public query ({ caller }) func getSatelliteAnalysisHistory() : async [SatelliteAnalysis] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access satellite analysis history");
    };

    Ownership.visibleTo(satelliteAnalyses.values(), caller, callerIsAdmin(caller));
  };

  // Return success confirmation for real-time cache invalidation
  public shared ({ caller }) func saveCoralAnalysis(
    region : Text,
    imageId : ?Text,
    bleachingProbability : Float,
    thermalStress : Float,
    riskScore : Float,
    dataType : Text,
  ) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can save coral analyses");
    };

    let analysis : CoralAnalysis = {
      region;
      imageId;
      bleachingProbability;
      thermalStress;
      riskScore;
      alertStatus = AnalysisRules.coralAlertStatus(riskScore);
      dataType;
      timestamp = Time.now();
      owner = caller;
    };

    coralAnalyses.add(AnalysisRules.coralRecordKey(region, nextCoralSeq), analysis);
    nextCoralSeq += 1;
    true;
  };

  public query ({ caller }) func getCoralAnalysisHistory() : async [CoralAnalysis] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access coral analysis history");
    };

    Ownership.visibleTo(coralAnalyses.values(), caller, callerIsAdmin(caller));
  };

  // Return success confirmation for real-time cache invalidation
  public shared ({ caller }) func saveAISAnalysis(
    id : Text,
    dataModule : Text,
    region : Text,
    vesselIDs : [Text],
    riskScore : Float,
  ) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can save AIS analyses");
    };

    let analysis : AISAnalysis = {
      id;
      dataModule;
      region;
      vesselIDs;
      riskScore;
      alertStatus = AnalysisRules.aisAlertStatus(riskScore);
      timestamp = Time.now();
      owner = caller;
    };

    requireWritable(aisAnalyses.get(id), caller);
    aisAnalyses.add(id, analysis);
    true;
  };

  public query ({ caller }) func getAISAnalysisHistory() : async [AISAnalysis] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access AIS analysis history");
    };

    Ownership.visibleTo(aisAnalyses.values(), caller, callerIsAdmin(caller));
  };

  // Return success confirmation for real-time cache invalidation
  public shared ({ caller }) func saveIoTAnalysis(
    id : Text,
    dataModule : Text,
    region : Text,
    dataType : Text,
    riskScore : Float,
  ) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can save IoT analyses");
    };

    let analysis : IoTAnalysis = {
      id;
      dataModule;
      region;
      dataType;
      riskScore;
      alertStatus = AnalysisRules.iotAlertStatus(riskScore);
      timestamp = Time.now();
      owner = caller;
    };

    requireWritable(iotAnalyses.get(id), caller);
    iotAnalyses.add(id, analysis);
    true;
  };

  public query ({ caller }) func getIoTAnalysisHistory() : async [IoTAnalysis] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access IoT analysis history");
    };

    Ownership.visibleTo(iotAnalyses.values(), caller, callerIsAdmin(caller));
  };

  // Return success confirmation for real-time cache invalidation
  public shared ({ caller }) func saveFusionAnalysis(
    id : Text,
    correlations : FusionCorrelations,
    fusionRiskScore : Float,
    globalRiskScore : Float,
    alertsGenerated : Nat,
    aiRecommendations : AIRecommendations,
  ) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can save fusion analysis records");
    };

    let fusionAnalysis : FusionAnalysisRecord = {
      id;
      timestamp = Time.now();
      correlations;
      fusionRiskScore;
      globalRiskScore;
      alertsGenerated;
      owner = caller;
      aiRecommendations = ?aiRecommendations;
    };

    requireWritable(fusionAnalysisHistory.get(id), caller);
    fusionAnalysisHistory.add(id, fusionAnalysis);
    true;
  };

  public query ({ caller }) func getFusionAnalysisHistory() : async [FusionAnalysisRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access fusion analysis history");
    };

    Ownership.visibleTo(fusionAnalysisHistory.values(), caller, callerIsAdmin(caller));
  };

  // Get AI recommendations for a specific fusion analysis - requires authentication
  public query ({ caller }) func getAIRecommendations(id : Text) : async ?AIRecommendations {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access AI recommendations");
    };

    switch (fusionAnalysisHistory.get(id)) {
      case (?record) {
        if (Ownership.mayRead(record, caller, callerIsAdmin(caller))) { record.aiRecommendations } else { null };
      };
      case (null) { null };
    };
  };

  func computeSeverity(riskScore : Float) : Nat {
    if (riskScore < 0.25) {
      1;
    } else if (riskScore < 0.5) {
      2;
    } else if (riskScore < 0.75) {
      3;
    } else {
      4;
    };
  };

  public query ({ caller }) func getAllAlerts() : async [Alert] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access alerts");
    };

    alerts.values().toArray();
  };

  public query ({ caller }) func getAlertsByType(alertType : Text) : async [Alert] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access alerts");
    };

    let filteredList = List.empty<Alert>();

    for (alert in alerts.values()) {
      if (alert.type_ == alertType) {
        filteredList.add(alert);
      };
    };

    filteredList.toArray();
  };

  public query ({ caller }) func getAlertsBySeverity(severity : Nat) : async [Alert] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access alerts");
    };

    let filteredList = List.empty<Alert>();

    for (alert in alerts.values()) {
      if (alert.severity == severity) {
        filteredList.add(alert);
      };
    };

    filteredList.toArray();
  };

  public shared ({ caller }) func saveAlert(
    id : Text,
    type_ : Text,
    severity : Nat,
    source : ?Text,
  ) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can create alerts");
    };

    let alert : Alert = {
      id;
      type_;
      severity;
      source;
      timestamp = Time.now();
      owner = caller;
    };

    requireWritable(alerts.get(id), caller);
    alerts.add(id, alert);
    true;
  };

  public shared ({ caller }) func updateAlert(
    id : Text,
    type_ : Text,
    severity : Nat,
    source : ?Text,
  ) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can update alerts");
    };

    switch (alerts.get(id)) {
      case (null) {
        Runtime.trap("Alert not found");
      };
      case (?existingAlert) {
        if (existingAlert.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only update your own alerts unless you are an admin");
        };

        let updatedAlert : Alert = {
          id;
          type_;
          severity;
          source;
          timestamp = existingAlert.timestamp;
          owner = existingAlert.owner;
        };

        alerts.add(id, updatedAlert);
        true;
      };
    };
  };
};
