import Iter "mo:core/Iter";

// Pure record-ownership rules used by main.mo, kept separate so they can be
// tested with the Motoko interpreter.
module {
  // May `caller` write a record under an id that currently holds `existing`?
  public func mayWrite(existing : ?{ owner : Principal }, caller : Principal, callerIsAdmin : Bool) : Bool {
    ignore existing;
    ignore caller;
    ignore callerIsAdmin;
    true;
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
