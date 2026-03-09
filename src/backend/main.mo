import Int "mo:core/Int";
import Map "mo:core/Map";
import Time "mo:core/Time";
import MixinStorage "blob-storage/Mixin";

actor {
  include MixinStorage();

  public type FileRecord = {
    id : Text;
    title : Text;
    filename : Text;
    fileType : Text;
    size : Nat;
    blobId : Text;
    uploadedAt : Int;
  };

  let files = Map.empty<Text, FileRecord>();

  public shared ({ caller }) func createFileRecord(title : ?Text, filename : Text, fileType : Text, size : Nat, blobId : Text) : async Text {
    let id = blobId;
    let record : FileRecord = {
      id;
      title = switch (title) {
        case (null) { filename };
        case (?title) { title };
      };
      filename;
      fileType;
      size;
      blobId;
      uploadedAt = Time.now();
    };
    files.add(id, record);
    id;
  };

  public query ({ caller }) func getFileRecord(id : Text) : async ?FileRecord {
    files.get(id);
  };

  public query ({ caller }) func getAllFiles() : async [FileRecord] {
    files.values().toArray();
  };

  public shared ({ caller }) func deleteFile(id : Text) : async () {
    switch (files.get(id)) {
      case (null) { Runtime.trap("File does not exist") };
      case (?_file) {
        files.remove(id);
      };
    };
  };
};
