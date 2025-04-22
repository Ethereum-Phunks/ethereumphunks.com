-- Update fetch_events_sepolia function to include offset parameter
CREATE OR REPLACE FUNCTION "public"."fetch_events_sepolia"(
    "p_limit" integer,
    "p_type" "text" DEFAULT NULL::"text",
    "p_collection_slug" "text" DEFAULT 'ethereum-phunks'::"text",
    "p_offset" integer DEFAULT 0
) RETURNS TABLE(
    "hashId" "text",
    "from" "text",
    "to" "text",
    "tokenId" bigint,
    "blockTimestamp" timestamp with time zone,
    "type" "text",
    "value" "text",
    "slug" "text",
    "sha" "text"
)
    LANGUAGE "plpgsql"
    AS $$DECLARE
    "marketAddress" CONSTANT TEXT := '0x3dfbc8c62d3ce0059bdaf21787ec24d5d116fe1e';  -- market address
    "auctionAddress" CONSTANT TEXT := '0xc6a824d8cce7c946a3f35879694b9261a36fc823'; -- auction address
BEGIN
    RETURN QUERY EXECUTE
    'SELECT
        e."hashId",
        e.from,
        e.to,
        eg."tokenId",
        e."blockTimestamp",
        e.type,
        e.value,
        eg.slug,
        eg.sha
    FROM
        public.events_sepolia e
    INNER JOIN public.ethscriptions_sepolia eg ON e."hashId" = eg."hashId"
    WHERE
        eg.slug = ''' || p_collection_slug || '''
        AND e.to != ''' || "auctionAddress" || '''
        AND e.to != ''' || "marketAddress" || '''
        AND e.from != ''' || "auctionAddress" || '''
        AND e.type != ''PhunkNoLongerForSale''' ||
        (CASE WHEN p_type IS NOT NULL THEN
            ' AND e.type = ''' || p_type || ''''
        ELSE
            ''
        END) ||
    ' ORDER BY e."blockTimestamp" DESC, e."txId" ASC
    LIMIT ' || p_limit || '
    OFFSET ' || p_offset;
END;$$;
