export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      attributes: {
        Row: {
          sha: string
          slug: string | null
          tokenId: number | null
          values: Json | null
        }
        Insert: {
          sha: string
          slug?: string | null
          tokenId?: number | null
          values?: Json | null
        }
        Update: {
          sha?: string
          slug?: string | null
          tokenId?: number | null
          values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "attributes_sha_fkey"
            columns: ["sha"]
            isOneToOne: true
            referencedRelation: "ethscriptions"
            referencedColumns: ["sha"]
          },
        ]
      }
      auctionBids: {
        Row: {
          amount: string
          auctionId: number
          createdAt: string
          extended: boolean
          fromAddress: string
          id: number
        }
        Insert: {
          amount?: string
          auctionId: number
          createdAt?: string
          extended?: boolean
          fromAddress?: string
          id?: number
        }
        Update: {
          amount?: string
          auctionId?: number
          createdAt?: string
          extended?: boolean
          fromAddress?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "auctionBids_auctionId_fkey"
            columns: ["auctionId"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["auctionId"]
          },
        ]
      }
      auctionBids_goerli: {
        Row: {
          amount: string
          auctionId: number
          createdAt: string
          fromAddress: string
          id: number
          txHash: string
        }
        Insert: {
          amount?: string
          auctionId: number
          createdAt?: string
          fromAddress?: string
          id?: number
          txHash: string
        }
        Update: {
          amount?: string
          auctionId?: number
          createdAt?: string
          fromAddress?: string
          id?: number
          txHash?: string
        }
        Relationships: []
      }
      auctionBids_sepolia: {
        Row: {
          amount: string
          auctionId: number
          createdAt: string
          extended: boolean
          fromAddress: string
          id: number
        }
        Insert: {
          amount?: string
          auctionId: number
          createdAt?: string
          extended?: boolean
          fromAddress?: string
          id?: number
        }
        Update: {
          amount?: string
          auctionId?: number
          createdAt?: string
          extended?: boolean
          fromAddress?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "public_auctionBids_sepolia_auctionId_fkey"
            columns: ["auctionId"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["auctionId"]
          },
        ]
      }
      auctions: {
        Row: {
          amount: string
          auctionId: number
          bidder: string | null
          createdAt: string
          endTime: string | null
          hashId: string
          prevOwner: string | null
          settled: boolean
          startTime: string | null
        }
        Insert: {
          amount?: string
          auctionId?: number
          bidder?: string | null
          createdAt?: string
          endTime?: string | null
          hashId: string
          prevOwner?: string | null
          settled?: boolean
          startTime?: string | null
        }
        Update: {
          amount?: string
          auctionId?: number
          bidder?: string | null
          createdAt?: string
          endTime?: string | null
          hashId?: string
          prevOwner?: string | null
          settled?: boolean
          startTime?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_hashId_fkey"
            columns: ["hashId"]
            isOneToOne: false
            referencedRelation: "ethscriptions"
            referencedColumns: ["hashId"]
          },
        ]
      }
      auctions_goerli: {
        Row: {
          amount: string
          auctionId: number
          bidder: string | null
          createdAt: string
          endTime: string | null
          hashId: string
          prevOwner: string | null
          settled: boolean
          startTime: string | null
        }
        Insert: {
          amount?: string
          auctionId?: number
          bidder?: string | null
          createdAt?: string
          endTime?: string | null
          hashId: string
          prevOwner?: string | null
          settled?: boolean
          startTime?: string | null
        }
        Update: {
          amount?: string
          auctionId?: number
          bidder?: string | null
          createdAt?: string
          endTime?: string | null
          hashId?: string
          prevOwner?: string | null
          settled?: boolean
          startTime?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_goerli_hashid_fkey"
            columns: ["hashId"]
            isOneToOne: false
            referencedRelation: "ethscriptions_goerli"
            referencedColumns: ["hashId"]
          },
        ]
      }
      auctions_sepolia: {
        Row: {
          amount: string
          auctionId: number
          bidder: string | null
          createdAt: string
          endTime: string | null
          hashId: string
          prevOwner: string | null
          settled: boolean
          startTime: string | null
        }
        Insert: {
          amount?: string
          auctionId?: number
          bidder?: string | null
          createdAt?: string
          endTime?: string | null
          hashId: string
          prevOwner?: string | null
          settled?: boolean
          startTime?: string | null
        }
        Update: {
          amount?: string
          auctionId?: number
          bidder?: string | null
          createdAt?: string
          endTime?: string | null
          hashId?: string
          prevOwner?: string | null
          settled?: boolean
          startTime?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_auctions_sepolia_hashId_fkey"
            columns: ["hashId"]
            isOneToOne: false
            referencedRelation: "ethscriptions"
            referencedColumns: ["hashId"]
          },
        ]
      }
      bids: {
        Row: {
          createdAt: string
          fromAddress: string
          hashId: string
          txHash: string
          value: string
        }
        Insert: {
          createdAt?: string
          fromAddress: string
          hashId: string
          txHash: string
          value?: string
        }
        Update: {
          createdAt?: string
          fromAddress?: string
          hashId?: string
          txHash?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_hashId_fkey"
            columns: ["hashId"]
            isOneToOne: true
            referencedRelation: "ethscriptions"
            referencedColumns: ["hashId"]
          },
        ]
      }
      bids_goerli: {
        Row: {
          createdAt: string
          fromAddress: string
          hashId: string
          txHash: string
          value: string
        }
        Insert: {
          createdAt?: string
          fromAddress: string
          hashId: string
          txHash: string
          value?: string
        }
        Update: {
          createdAt?: string
          fromAddress?: string
          hashId?: string
          txHash?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_goerli_hashId_fkey"
            columns: ["hashId"]
            isOneToOne: true
            referencedRelation: "ethscriptions_goerli"
            referencedColumns: ["hashId"]
          },
        ]
      }
      bids_sepolia: {
        Row: {
          createdAt: string
          fromAddress: string
          hashId: string
          txHash: string
          value: string
        }
        Insert: {
          createdAt?: string
          fromAddress: string
          hashId: string
          txHash: string
          value?: string
        }
        Update: {
          createdAt?: string
          fromAddress?: string
          hashId?: string
          txHash?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_bids_sepolia_hashId_fkey"
            columns: ["hashId"]
            isOneToOne: true
            referencedRelation: "ethscriptions_sepolia"
            referencedColumns: ["hashId"]
          },
        ]
      }
      blocks: {
        Row: {
          blockNumber: number
          createdAt: string
          network: number
        }
        Insert: {
          blockNumber?: number
          createdAt?: string
          network?: number
        }
        Update: {
          blockNumber?: number
          createdAt?: string
          network?: number
        }
        Relationships: []
      }
      collections: {
        Row: {
          active: boolean
          createdAt: string
          description: string | null
          id: number
          image: string | null
          name: string
          posterHashId: string | null
          singleName: string | null
          slug: string
          supply: number
        }
        Insert: {
          active?: boolean
          createdAt?: string
          description?: string | null
          id?: number
          image?: string | null
          name: string
          posterHashId?: string | null
          singleName?: string | null
          slug: string
          supply?: number
        }
        Update: {
          active?: boolean
          createdAt?: string
          description?: string | null
          id?: number
          image?: string | null
          name?: string
          posterHashId?: string | null
          singleName?: string | null
          slug?: string
          supply?: number
        }
        Relationships: []
      }
      collections_goerli: {
        Row: {
          active: boolean
          createdAt: string
          description: string | null
          id: number
          image: string | null
          name: string
          posterHashId: string | null
          singleName: string | null
          slug: string
          supply: number
        }
        Insert: {
          active?: boolean
          createdAt?: string
          description?: string | null
          id?: number
          image?: string | null
          name: string
          posterHashId?: string | null
          singleName?: string | null
          slug: string
          supply?: number
        }
        Update: {
          active?: boolean
          createdAt?: string
          description?: string | null
          id?: number
          image?: string | null
          name?: string
          posterHashId?: string | null
          singleName?: string | null
          slug?: string
          supply?: number
        }
        Relationships: []
      }
      collections_sepolia: {
        Row: {
          active: boolean
          createdAt: string
          description: string | null
          id: number
          image: string | null
          name: string
          posterHashId: string | null
          singleName: string | null
          slug: string
          supply: number
        }
        Insert: {
          active?: boolean
          createdAt?: string
          description?: string | null
          id?: number
          image?: string | null
          name: string
          posterHashId?: string | null
          singleName?: string | null
          slug: string
          supply?: number
        }
        Update: {
          active?: boolean
          createdAt?: string
          description?: string | null
          id?: number
          image?: string | null
          name?: string
          posterHashId?: string | null
          singleName?: string | null
          slug?: string
          supply?: number
        }
        Relationships: []
      }
      ethscriptions: {
        Row: {
          createdAt: string | null
          creator: string | null
          data: string | null
          hashId: string
          oldHashId: string | null
          owner: string | null
          prevOwner: string | null
          sha: string
          slug: string | null
          tokenId: number
        }
        Insert: {
          createdAt?: string | null
          creator?: string | null
          data?: string | null
          hashId: string
          oldHashId?: string | null
          owner?: string | null
          prevOwner?: string | null
          sha: string
          slug?: string | null
          tokenId?: number
        }
        Update: {
          createdAt?: string | null
          creator?: string | null
          data?: string | null
          hashId?: string
          oldHashId?: string | null
          owner?: string | null
          prevOwner?: string | null
          sha?: string
          slug?: string | null
          tokenId?: number
        }
        Relationships: [
          {
            foreignKeyName: "ethscriptions_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["slug"]
          },
        ]
      }
      ethscriptions_goerli: {
        Row: {
          createdAt: string | null
          creator: string | null
          data: string | null
          hashId: string
          owner: string
          prevOwner: string | null
          sha: string
          slug: string
          tokenId: number
        }
        Insert: {
          createdAt?: string | null
          creator?: string | null
          data?: string | null
          hashId: string
          owner: string
          prevOwner?: string | null
          sha: string
          slug: string
          tokenId?: number
        }
        Update: {
          createdAt?: string | null
          creator?: string | null
          data?: string | null
          hashId?: string
          owner?: string
          prevOwner?: string | null
          sha?: string
          slug?: string
          tokenId?: number
        }
        Relationships: [
          {
            foreignKeyName: "ethscriptions_goerli_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "collections_goerli"
            referencedColumns: ["slug"]
          },
        ]
      }
      ethscriptions_sepolia: {
        Row: {
          createdAt: string | null
          creator: string | null
          hashId: string
          locked: boolean
          oldHashId: string | null
          owner: string | null
          prevOwner: string | null
          sha: string
          slug: string | null
          tokenId: number
        }
        Insert: {
          createdAt?: string | null
          creator?: string | null
          hashId: string
          locked?: boolean
          oldHashId?: string | null
          owner?: string | null
          prevOwner?: string | null
          sha: string
          slug?: string | null
          tokenId?: number
        }
        Update: {
          createdAt?: string | null
          creator?: string | null
          hashId?: string
          locked?: boolean
          oldHashId?: string | null
          owner?: string | null
          prevOwner?: string | null
          sha?: string
          slug?: string | null
          tokenId?: number
        }
        Relationships: [
          {
            foreignKeyName: "public_ethscriptions_sepolia_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "collections_sepolia"
            referencedColumns: ["slug"]
          },
        ]
      }
      events: {
        Row: {
          blockHash: string
          blockNumber: number | null
          blockTimestamp: string | null
          from: string
          hashId: string
          to: string
          txHash: string
          txId: string
          txIndex: number
          type: string | null
          value: string | null
        }
        Insert: {
          blockHash: string
          blockNumber?: number | null
          blockTimestamp?: string | null
          from: string
          hashId: string
          to: string
          txHash: string
          txId: string
          txIndex?: number
          type?: string | null
          value?: string | null
        }
        Update: {
          blockHash?: string
          blockNumber?: number | null
          blockTimestamp?: string | null
          from?: string
          hashId?: string
          to?: string
          txHash?: string
          txId?: string
          txIndex?: number
          type?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_hashId_fkey"
            columns: ["hashId"]
            isOneToOne: false
            referencedRelation: "ethscriptions"
            referencedColumns: ["hashId"]
          },
        ]
      }
      events_goerli: {
        Row: {
          blockHash: string
          blockNumber: number | null
          blockTimestamp: string | null
          from: string
          hashId: string
          to: string
          txHash: string
          txId: string
          txIndex: number
          type: string | null
          value: string | null
        }
        Insert: {
          blockHash: string
          blockNumber?: number | null
          blockTimestamp?: string | null
          from: string
          hashId: string
          to: string
          txHash: string
          txId: string
          txIndex?: number
          type?: string | null
          value?: string | null
        }
        Update: {
          blockHash?: string
          blockNumber?: number | null
          blockTimestamp?: string | null
          from?: string
          hashId?: string
          to?: string
          txHash?: string
          txId?: string
          txIndex?: number
          type?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_goerli_hashId_fkey"
            columns: ["hashId"]
            isOneToOne: false
            referencedRelation: "ethscriptions_goerli"
            referencedColumns: ["hashId"]
          },
        ]
      }
      events_sepolia: {
        Row: {
          blockHash: string
          blockNumber: number | null
          blockTimestamp: string | null
          from: string
          hashId: string
          to: string
          txHash: string
          txId: string
          txIndex: number
          type: string | null
          value: string | null
        }
        Insert: {
          blockHash: string
          blockNumber?: number | null
          blockTimestamp?: string | null
          from: string
          hashId: string
          to: string
          txHash: string
          txId: string
          txIndex?: number
          type?: string | null
          value?: string | null
        }
        Update: {
          blockHash?: string
          blockNumber?: number | null
          blockTimestamp?: string | null
          from?: string
          hashId?: string
          to?: string
          txHash?: string
          txId?: string
          txIndex?: number
          type?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_events_sepolia_hashId_fkey"
            columns: ["hashId"]
            isOneToOne: false
            referencedRelation: "ethscriptions_sepolia"
            referencedColumns: ["hashId"]
          },
        ]
      }
      listings: {
        Row: {
          createdAt: string
          hashId: string
          listed: boolean
          listedBy: string
          minValue: string
          toAddress: string | null
          txHash: string
        }
        Insert: {
          createdAt?: string
          hashId: string
          listed?: boolean
          listedBy: string
          minValue: string
          toAddress?: string | null
          txHash: string
        }
        Update: {
          createdAt?: string
          hashId?: string
          listed?: boolean
          listedBy?: string
          minValue?: string
          toAddress?: string | null
          txHash?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_hashId_fkey"
            columns: ["hashId"]
            isOneToOne: true
            referencedRelation: "ethscriptions"
            referencedColumns: ["hashId"]
          },
        ]
      }
      listings_goerli: {
        Row: {
          createdAt: string
          hashId: string
          listed: boolean
          listedBy: string
          minValue: string
          toAddress: string | null
          txHash: string
        }
        Insert: {
          createdAt?: string
          hashId: string
          listed?: boolean
          listedBy: string
          minValue: string
          toAddress?: string | null
          txHash: string
        }
        Update: {
          createdAt?: string
          hashId?: string
          listed?: boolean
          listedBy?: string
          minValue?: string
          toAddress?: string | null
          txHash?: string
        }
        Relationships: []
      }
      listings_sepolia: {
        Row: {
          createdAt: string
          hashId: string
          listed: boolean
          listedBy: string
          minValue: string
          toAddress: string | null
          txHash: string
        }
        Insert: {
          createdAt?: string
          hashId: string
          listed?: boolean
          listedBy: string
          minValue: string
          toAddress?: string | null
          txHash: string
        }
        Update: {
          createdAt?: string
          hashId?: string
          listed?: boolean
          listedBy?: string
          minValue?: string
          toAddress?: string | null
          txHash?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_listings_sepolia_hashId_fkey"
            columns: ["hashId"]
            isOneToOne: true
            referencedRelation: "ethscriptions_sepolia"
            referencedColumns: ["hashId"]
          },
        ]
      }
      users: {
        Row: {
          address: string
          createdAt: string | null
          points: number
        }
        Insert: {
          address: string
          createdAt?: string | null
          points?: number
        }
        Update: {
          address?: string
          createdAt?: string | null
          points?: number
        }
        Relationships: []
      }
      users_goerli: {
        Row: {
          address: string
          createdAt: string | null
          points: number
        }
        Insert: {
          address: string
          createdAt?: string | null
          points?: number
        }
        Update: {
          address?: string
          createdAt?: string | null
          points?: number
        }
        Relationships: []
      }
      users_sepolia: {
        Row: {
          address: string
          createdAt: string | null
          points: number
        }
        Insert: {
          address: string
          createdAt?: string | null
          points?: number
        }
        Update: {
          address?: string
          createdAt?: string | null
          points?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      addresses_are_holders_sepolia: {
        Args: {
          addresses: string[]
        }
        Returns: Json
      }
      fetch_all_with_pagination: {
        Args: {
          p_slug: string
          p_from_num: number
          p_to_num: number
          p_filters?: Json
        }
        Returns: Json
      }
      fetch_all_with_pagination_sepolia: {
        Args: {
          p_slug: string
          p_from_num: number
          p_to_num: number
          p_filters?: Json
        }
        Returns: Json
      }
      fetch_collections_with_previews: {
        Args: {
          preview_limit?: number
        }
        Returns: {
          ethscription: Json
        }[]
      }
      fetch_collections_with_previews_sepolia: {
        Args: {
          preview_limit?: number
        }
        Returns: {
          ethscription: Json
        }[]
      }
      fetch_ethscriptions_owned_with_listings_and_bids: {
        Args: {
          address: string
          collection_slug?: string
        }
        Returns: {
          ethscription: Json
        }[]
      }
      fetch_ethscriptions_owned_with_listings_and_bids_sepolia: {
        Args: {
          address: string
          collection_slug?: string
        }
        Returns: {
          ethscription: Json
        }[]
      }
      fetch_ethscriptions_with_listings_and_bids: {
        Args: {
          collection_slug?: string
        }
        Returns: {
          ethscription: Json
        }[]
      }
      fetch_ethscriptions_with_listings_and_bids_sepolia: {
        Args: {
          collection_slug?: string
        }
        Returns: {
          ethscription: Json
        }[]
      }
      fetch_events: {
        Args: {
          p_limit: number
          p_type?: string
          p_collection_slug?: string
        }
        Returns: {
          hashId: string
          fromAddress: string
          toAddress: string
          tokenId: number
          blockTimestamp: string
          type: string
          value: string
          slug: string
          sha: string
        }[]
      }
      fetch_events_sepolia: {
        Args: {
          p_limit: number
          p_type?: string
          p_collection_slug?: string
        }
        Returns: {
          hashId: string
          fromAddress: string
          toAddress: string
          tokenId: number
          blockTimestamp: string
          type: string
          value: string
          slug: string
          sha: string
        }[]
      }
      fetch_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: {
          address: string
          points: number
          sales: number
        }[]
      }
      fetch_leaderboard_sepolia: {
        Args: Record<PropertyKey, never>
        Returns: {
          address: string
          points: number
          sales: number
        }[]
      }
      get_total_volume: {
        Args: {
          start_date?: string
          end_date?: string
          slug_filter?: string
        }
        Returns: {
          volume: number
          sales: number
        }[]
      }
      get_total_volume_sepolia: {
        Args: {
          start_date?: string
          end_date?: string
          slug_filter?: string
        }
        Returns: {
          volume: number
          sales: number
        }[]
      }
      holder_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
