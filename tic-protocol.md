# TIC (Transaction Inscribed Comments) Protocol Specification

## Overview
TIC is a child protocol built on top of [Ethscriptions](https://docs.ethscriptions.com/) that enables on-chain commenting capabilities through Ethereum transaction calldata. It provides a standardized way to associate comments with blockchain entities such as addresses, transaction hashes, or other on-chain identifiers. Comments can be nested and replied to by setting the topic to the hash of the parent comment.

## Protocol Rules

### 1. Data Structure
Comments must be formatted as JSON and encoded as a data URL with the following MIME type:
`data:message/vnd.tic+json`


### 2. Comment Object Schema
```typescript
interface TIC {
  // Required: Identifier that links the comment to a blockchain entity
  topic: `0x${string}`;  
  
  // Required: The comment content
  content: string;
  
  // Required: Protocol version in hex format
  version: `0x${string}`;
  
  // Required: Specifies the content encoding format
  encoding: EncodingType;

  // Optional: Specifies the comment type for application-specific features
  type?: CommentType;
}

type EncodingType = 'utf8' | 'base64' | 'hex' | 'json' | 'markdown' | 'ascii';

type CommentType = 
  | 'comment'  // Basic comment
  | 'reaction' // Like/emoji reaction to content
```

### 3. Field Specifications

#### topic (Required)
- Must be a valid hexadecimal string
- Can represent:
  - Ethereum addresses (40 characters)
  - Transaction hashes (64 characters)
  - Comment hashes (for replies/nested comments)
  - Any other valid blockchain identifier
- No length restriction, but must be a valid hex value
- When used for replies, the topic should be set to the hash of the parent comment

#### content (Required)
- The actual comment data
- Must be encoded according to the specified `encoding` field
- No length restriction beyond Ethereum calldata limits

#### version (Required)
- Must be a hexadecimal string
- Current protocol version: `0x0`
- Used for future protocol upgrades and compatibility

#### encoding (Required)
Must be one of the following values:
- `utf8`: UTF-8 encoded text
- `base64`: Base64 encoded data
- `hex`: Hexadecimal encoded data
- `json`: JSON formatted data
- `markdown`: Markdown formatted text
- `ascii`: ASCII encoded text

#### type (Optional)
- Specifies the intended use of the comment
- Current supported types:
  - `comment`: Standard text comment (default if not specified)
  - `reaction`: Represents a reaction to content (like, emoji, etc.)
- Applications can use this field to implement specialized features
- Omitting this field defaults to standard comment behavior

### 4. Example Comment Inscription

```typescript
// Original comment
const comment = {
  topic: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  content: "Great project!",
  version: "0x0",
  encoding: "utf8"
};

// Reaction to the above comment
const reaction = {
  topic: "0x123...", // Hash of the parent comment
  content: "👍",
  version: "0x0",
  encoding: "utf8",
  type: "reaction"
};

// Data URL format
const dataUrl = `data:message/vnd.tic+json,${JSON.stringify(comment)}`;
```

### 5. Inscription Process
1. Create a valid comment object following the schema
2. Convert the object to a JSON string
3. Create a data URL with the MIME type `message/vnd.tic+json`
4. Submit the data URL as calldata in an Ethereum transaction following the Ethscriptions protocol

### 6. Comment Deletion
Comments can be marked as deleted by transferring the comment's Ethscription to the zero address:
- Zero address: `0x0000000000000000000000000000000000000000`

The transfer of a comment Ethscription to the zero address signals that the original author intends to delete their comment. While the comment data remains on-chain due to the immutable nature of blockchain data, indexers and applications should:
1. Mark these comments as deleted
2. Hide them from default views
3. Maintain the comment in the tree structure to preserve reply chains

Example deletion process:
```typescript
// Using the Ethscriptions protocol transfer functionality to mark comment as deleted
await transferEthscription({
  ethscriptionId: "0x123...", // The comment's ethscription ID
  to: "0x0000000000000000000000000000000000000000" // Zero address
});
```

## Validation Rules
1. All required fields must be present
2. `version` must be a valid hex string
3. `encoding` must be one of the specified EncodingType values
4. `topic` must be a valid hex string
5. `content` must be properly encoded according to the specified encoding type
6. If `type` is present, it must be one of the specified CommentType values
7. A comment should be considered deleted if its Ethscription has been transferred to the zero address

## Notes
- Comments are immutable once inscribed
- Comments inherit all security and decentralization properties of the Ethscriptions protocol
- Comments can be nested by using the parent comment's hash as the topic
- Indexers should validate all comments against these protocol rules
- Future versions may introduce additional fields or functionality through version updates
- While comments can be marked as deleted, the underlying data remains on-chain due to the immutable nature of blockchain data
- Applications should respect deletion markers when displaying comments
- Deleted comments' replies should still be preserved and displayed

## References
- [Ethscriptions Protocol Specification](https://docs.ethscriptions.com/overview/protocol-specification)
