import Iter "mo:core/Iter";

// Pure record-ownership rules used by main.mo, kept separate so they can be
// tested with the Motoko interpreter.
module {
  // May `caller` write a record under an id that currently holds `existing`?
  // New ids are free; an existing record may be replaced by its owner or an
  // admin (the same rule updateAlert uses).
  public func mayWrite(existing : ?{ owner : Principal }, caller : Principal, callerIsAdmin : Bool) : Bool {
    switch (existing) {
      case (null) { true };
      case (?record) { record.owner == caller or callerIsAdmin };
    };
  };

  // May `caller` read `record`?
  public func mayRead(record : { owner : Principal }, caller : Principal, callerIsAdmin : Bool) : Bool {
    ignore record;
    ignore caller;
    ignore callerIsAdmin;
    true;
  };

  // The records `caller` may read.
  public func visibleTo<V <: { owner : Principal }>(records : Iter.Iter<V>, caller : Principal, callerIsAdmin : Bool) : [V] {
    ignore caller;
    ignore callerIsAdmin;
    records.toArray();
  };
};
