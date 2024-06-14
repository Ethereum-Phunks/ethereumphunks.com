
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE SCHEMA IF NOT EXISTS "public";

ALTER SCHEMA "public" OWNER TO "pg_database_owner";

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE OR REPLACE FUNCTION "public"."addresses_are_holders"("addresses" "text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  market_address text := '0xd3418772623be1a3cc6b6d45cb46420cedd9154a';
BEGIN
  RETURN (
    WITH filtered AS (
      SELECT
        CASE
          WHEN es.owner = market_address THEN es."prevOwner"
          ELSE es.owner
        END AS effective_owner,
        es."tokenId",
        es."hashId",
        es.sha,
        es.owner,
        es."prevOwner",
        es."createdAt"
      FROM ethscriptions es
      WHERE (es.owner = ANY(addresses) AND es.owner <> market_address)
         OR (es."prevOwner" = ANY(addresses) AND es.owner = market_address)
    ),
    ranked AS (
      SELECT
        *,
        ROW_NUMBER() OVER (PARTITION BY effective_owner ORDER BY "createdAt" ASC) as rn
      FROM filtered
    )
    SELECT jsonb_agg(jsonb_build_object(
      'address', effective_owner,
      'item', jsonb_build_object(
        'tokenId', "tokenId",
        'hashId', "hashId",
        'sha', sha,
        'owner', owner,
        'prevOwner', "prevOwner"
      )
    ))
    FROM ranked
    WHERE rn = 1
  );
END;
$$;

ALTER FUNCTION "public"."addresses_are_holders"("addresses" "text"[]) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."addresses_are_holders_sepolia"("addresses" "text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  market_address text := '0x3dfbc8c62d3ce0059bdaf21787ec24d5d116fe1e';
BEGIN
  RETURN (
    WITH filtered AS (
      SELECT
        CASE
          WHEN es.owner = market_address THEN es."prevOwner"
          ELSE es.owner
        END AS effective_owner,
        es."tokenId",
        es."hashId",
        es.sha,
        es.owner,
        es."prevOwner",
        es."createdAt"
      FROM ethscriptions_sepolia es
      WHERE (es.owner = ANY(addresses) AND es.owner <> market_address)
         OR (es."prevOwner" = ANY(addresses) AND es.owner = market_address)
    ),
    ranked AS (
      SELECT
        *,
        ROW_NUMBER() OVER (PARTITION BY effective_owner ORDER BY "createdAt" ASC) as rn
      FROM filtered
    )
    SELECT jsonb_agg(jsonb_build_object(
      'address', effective_owner,
      'item', jsonb_build_object(
        'tokenId', "tokenId",
        'hashId', "hashId",
        'sha', sha,
        'owner', owner,
        'prevOwner', "prevOwner"
      )
    ))
    FROM ranked
    WHERE rn = 1
  );
END;
$$;

ALTER FUNCTION "public"."addresses_are_holders_sepolia"("addresses" "text"[]) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."fetch_all_with_pagination"("p_slug" "text", "p_from_num" integer, "p_to_num" integer, "p_filters" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    result_json JSON;
    total_count INT;
    filter_count INT;
BEGIN
    -- Calculate the number of filters
    SELECT COUNT(*)
    INTO filter_count
    FROM jsonb_each_text(p_filters);

    -- First, calculate the total count with filters applied
    SELECT COUNT(*)
    INTO total_count
    FROM ethscriptions e
    LEFT JOIN attributes a ON e.sha = a.sha
    WHERE e.slug = p_slug
    AND (filter_count = 0 OR (
        SELECT COUNT(*)
        FROM jsonb_each_text(p_filters) f
        WHERE a.values ->> f.key ILIKE '%' || f.value || '%'
    ) = filter_count);

    -- Then, fetch the paginated data
    SELECT
        json_build_object(
            'data', COALESCE(json_agg(t.*), '[]'::json),
            'total_count', total_count
        )
    INTO result_json
    FROM (
        SELECT
            e."tokenId",
            e.slug,
            e."hashId",
            e.sha
        FROM ethscriptions e
        LEFT JOIN attributes a ON e.sha = a.sha
        WHERE e.slug = p_slug
        AND (filter_count = 0 OR (
            SELECT COUNT(*)
            FROM jsonb_each_text(p_filters) f
            WHERE a.values ->> f.key ILIKE '%' || f.value || '%'
        ) = filter_count)
        ORDER BY e."tokenId"
        LIMIT p_to_num - p_from_num + 1
        OFFSET p_from_num
    ) t;

    RETURN result_json;
END;
$$;

ALTER FUNCTION "public"."fetch_all_with_pagination"("p_slug" "text", "p_from_num" integer, "p_to_num" integer, "p_filters" "jsonb") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."fetch_all_with_pagination_sepolia"("p_slug" "text", "p_from_num" integer, "p_to_num" integer, "p_filters" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    result_json JSON;
    total_count INT;
    filter_count INT;
BEGIN
    -- Calculate the number of filters
    SELECT COUNT(*)
    INTO filter_count
    FROM jsonb_each_text(p_filters);

    -- First, calculate the total count with filters applied
    SELECT COUNT(*)
    INTO total_count
    FROM ethscriptions_sepolia e
    LEFT JOIN attributes a ON e.sha = a.sha
    WHERE e.slug = p_slug
    AND (filter_count = 0 OR (
        SELECT COUNT(*)
        FROM jsonb_each_text(p_filters) f
        WHERE a.values ->> f.key ILIKE '%' || f.value || '%'
    ) = filter_count);

    -- Then, fetch the paginated data
    SELECT
        json_build_object(
            'data', COALESCE(json_agg(t.*), '[]'::json),
            'total_count', total_count
        )
    INTO result_json
    FROM (
        SELECT
            e."tokenId",
            e.slug,
            e."hashId",
            e.sha
        FROM ethscriptions_sepolia e
        LEFT JOIN attributes a ON e.sha = a.sha
        WHERE e.slug = p_slug
        AND (filter_count = 0 OR (
            SELECT COUNT(*)
            FROM jsonb_each_text(p_filters) f
            WHERE a.values ->> f.key ILIKE '%' || f.value || '%'
        ) = filter_count)
        ORDER BY e."tokenId"
        LIMIT p_to_num - p_from_num + 1
        OFFSET p_from_num
    ) t;

    RETURN result_json;
END;
$$;

ALTER FUNCTION "public"."fetch_all_with_pagination_sepolia"("p_slug" "text", "p_from_num" integer, "p_to_num" integer, "p_filters" "jsonb") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."fetch_collections_with_previews"("preview_limit" integer DEFAULT 25) RETURNS TABLE("ethscription" "json")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT json_build_object(
        'slug', c.slug,
        'name', c.name,
        'image', c.image,
        'supply', c.supply,
        'previews', json_agg(json_build_object(
            'hashId', e."hashId",
            'tokenId', e."tokenId",
            'slug', c.slug,
            'sha', e.sha
        )) FILTER (WHERE e."hashId" IS NOT NULL)
    )
    FROM public.collections c
    LEFT JOIN LATERAL (
        SELECT e."hashId", e."tokenId", e.sha
        FROM public.ethscriptions e
        WHERE e.slug = c.slug
        ORDER BY e."createdAt" DESC
        LIMIT preview_limit
    ) e ON true
    WHERE
        (c.active = TRUE)
    GROUP BY c.slug, c.name, c.image;
END;
$$;

ALTER FUNCTION "public"."fetch_collections_with_previews"("preview_limit" integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."fetch_collections_with_previews_sepolia"("preview_limit" integer DEFAULT 25) RETURNS TABLE("ethscription" "json")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT json_build_object(
        'slug', c.slug,
        'name', c.name,
        'image', c.image,
        'supply', c.supply,
        'previews', json_agg(json_build_object(
            'hashId', e."hashId",
            'tokenId', e."tokenId",
            'slug', c.slug,
            'sha', e.sha
        )) FILTER (WHERE e."hashId" IS NOT NULL)
    )
    FROM public.collections_sepolia c
    LEFT JOIN LATERAL (
        SELECT e."hashId", e."tokenId", e.sha
        FROM public.ethscriptions_sepolia e
        WHERE e.slug = c.slug
        ORDER BY e."createdAt" DESC
        LIMIT preview_limit
    ) e ON true
    WHERE
        (c.active = TRUE)
    GROUP BY c.slug, c.name, c.image;
END;
$$;

ALTER FUNCTION "public"."fetch_collections_with_previews_sepolia"("preview_limit" integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."fetch_ethscriptions_owned_with_listings_and_bids"("address" "text", "collection_slug" "text" DEFAULT 'ethereum-phunks'::"text") RETURNS TABLE("ethscription" "json")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    "marketAddress" CONSTANT TEXT := '0xd3418772623be1a3cc6b6d45cb46420cedd9154a';  -- market address
    "auctionAddress" CONSTANT TEXT := ''; -- auction address
BEGIN
    RETURN QUERY
    SELECT json_build_object(
        'phunk', json_strip_nulls(json_build_object(
            'hashId', p."hashId",
            'tokenId', p."tokenId",
            'owner', p.owner,
            'prevOwner', p."prevOwner",
            'slug', p.slug,
            'sha', p.sha
        )),
        'listing', json_agg(json_strip_nulls(json_build_object(
            'createdAt', l."createdAt",
            'minValue', l."minValue"
        ))) FILTER (WHERE l."hashId" IS NOT NULL)
        -- ,
        -- 'bid', json_agg(json_strip_nulls(json_build_object(
        --     'createdAt', b."createdAt",
        --     'value', b.value
        -- ))) FILTER (WHERE b."hashId" IS NOT NULL)
    )
    FROM public.ethscriptions p
    LEFT JOIN public.listings l ON p."hashId" = l."hashId" AND l."toAddress" = '0x0000000000000000000000000000000000000000'
    LEFT JOIN public.bids b ON p."hashId" = b."hashId"
    WHERE (p.owner = address OR (p.owner = "marketAddress" AND p."prevOwner" = address))
          AND p."slug" = collection_slug
    GROUP BY p."hashId", p."tokenId", p.owner, p."prevOwner", p.slug, p.sha;
END;
$$;

ALTER FUNCTION "public"."fetch_ethscriptions_owned_with_listings_and_bids"("address" "text", "collection_slug" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."fetch_ethscriptions_owned_with_listings_and_bids_sepolia"("address" "text", "collection_slug" "text" DEFAULT 'ethereum-phunks'::"text") RETURNS TABLE("ethscription" "json")
    LANGUAGE "plpgsql"
    AS $$DECLARE
    "marketAddress" CONSTANT TEXT := '0x3dfbc8c62d3ce0059bdaf21787ec24d5d116fe1e';  -- market address
    "auctionAddress" CONSTANT TEXT := ''; -- auction address
    "bridgeAddressMainnet" CONSTANT TEXT := '0x1565f60d2469f18bbcc96b2c29220412f2fe98bd'; -- bridge address
BEGIN
    RETURN QUERY
    SELECT json_build_object(
        'phunk', json_strip_nulls(json_build_object(
            'hashId', p."hashId",
            'tokenId', p."tokenId",
            'owner', p.owner,
            'prevOwner', p."prevOwner",
            'slug', p.slug,
            'sha', p.sha
        )),
        'listing', json_agg(json_strip_nulls(json_build_object(
            'createdAt', l."createdAt",
            'minValue', l."minValue"
        ))) FILTER (WHERE l."hashId" IS NOT NULL)
        -- ,
        -- 'bid', json_agg(json_strip_nulls(json_build_object(
        --     'createdAt', b."createdAt",
        --     'value', b.value
        -- ))) FILTER (WHERE b."hashId" IS NOT NULL)
    )
    FROM public.ethscriptions_sepolia p
    LEFT JOIN public.listings_sepolia l ON p."hashId" = l."hashId" AND l."toAddress" = '0x0000000000000000000000000000000000000000'
    LEFT JOIN public.bids_sepolia b ON p."hashId" = b."hashId"
    WHERE (
      p.owner = address 
      OR (
        p.owner = "marketAddress" 
        AND p."prevOwner" = address
      )
      OR (
        p.owner = "bridgeAddressMainnet" 
        AND p."prevOwner" = address
      )
    )
    AND p."slug" = collection_slug
    GROUP BY p."hashId", p."tokenId", p.owner, p."prevOwner", p.slug, p.sha;
END;$$;

ALTER FUNCTION "public"."fetch_ethscriptions_owned_with_listings_and_bids_sepolia"("address" "text", "collection_slug" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."fetch_ethscriptions_with_listings_and_bids"("collection_slug" "text" DEFAULT 'ethereum-phunks'::"text") RETURNS TABLE("ethscription" "json")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT json_build_object(
        'ethscription', json_strip_nulls(json_build_object(
            'hashId', p."hashId",
            'tokenId', p."tokenId",
            'slug', p.slug,
            'sha', p.sha,
            'owner', p.owner,
            'prevOwner', p."prevOwner"
        )),
        'listing', json_agg(json_strip_nulls(json_build_object(
            'createdAt', l."createdAt",
            'minValue', l."minValue"
        ))) FILTER (WHERE l."hashId" IS NOT NULL)
        -- ,
        -- 'bid', json_agg(json_strip_nulls(json_build_object(
        --     'createdAt', b."createdAt",
        --     'value', b.value,
        --     'fromAddress', b."fromAddress"
        -- ))) FILTER (WHERE b."hashId" IS NOT NULL)
    )
    FROM public.ethscriptions p
    LEFT JOIN public.listings l ON p."hashId" = l."hashId" AND l."toAddress" = '0x0000000000000000000000000000000000000000'
    LEFT JOIN public.bids b ON p."hashId" = b."hashId"
    WHERE
        p."slug" = collection_slug
        AND (EXISTS (SELECT 1 FROM public.listings l2 WHERE l2."hashId" = p."hashId" AND l2."toAddress" = '0x0000000000000000000000000000000000000000')
             OR EXISTS (SELECT 1 FROM public.bids b2 WHERE b2."hashId" = p."hashId"))
    GROUP BY p."hashId", p."tokenId", p.slug, p.sha, p.owner, p."prevOwner";
END;
$$;

ALTER FUNCTION "public"."fetch_ethscriptions_with_listings_and_bids"("collection_slug" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."fetch_ethscriptions_with_listings_and_bids_sepolia"("collection_slug" "text" DEFAULT 'ethereum-phunks'::"text") RETURNS TABLE("ethscription" "json")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT json_build_object(
        'ethscription', json_strip_nulls(json_build_object(
            'hashId', p."hashId",
            'tokenId', p."tokenId",
            'slug', p."slug",
            'sha', p.sha,
            'owner', p.owner,
            'prevOwner', p."prevOwner"
        )),
        'listing', json_agg(json_strip_nulls(json_build_object(
            'createdAt', l."createdAt",
            'minValue', l."minValue",
            'listedBy', l."listedBy"
        ))) FILTER (WHERE l."hashId" IS NOT NULL),
        'bid', json_agg(json_strip_nulls(json_build_object(
            'createdAt', b."createdAt",
            'value', b.value,
            'fromAddress', b."fromAddress"
        ))) FILTER (WHERE b."hashId" IS NOT NULL)
    )
    FROM public.ethscriptions_sepolia p
    LEFT JOIN public.listings_sepolia l ON p."hashId" = l."hashId" AND l."toAddress" = '0x0000000000000000000000000000000000000000'
    LEFT JOIN public.bids_sepolia b ON p."hashId" = b."hashId"
    WHERE
        p."slug" = collection_slug
        AND (EXISTS (SELECT 1 FROM public.listings_sepolia l2 WHERE l2."hashId" = p."hashId" AND l2."toAddress" = '0x0000000000000000000000000000000000000000')
             OR EXISTS (SELECT 1 FROM public.bids_sepolia b2 WHERE b2."hashId" = p."hashId"))
    GROUP BY p."hashId";
END;
$$;

ALTER FUNCTION "public"."fetch_ethscriptions_with_listings_and_bids_sepolia"("collection_slug" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."fetch_events"("p_limit" integer, "p_type" "text" DEFAULT NULL::"text", "p_collection_slug" "text" DEFAULT 'ethereum-phunks'::"text") RETURNS TABLE("hashId" "text", "from" "text", "to" "text", "tokenId" bigint, "blockTimestamp" timestamp with time zone, "type" "text", "value" "text", "slug" "text", "sha" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    "marketAddress" CONSTANT TEXT := '0xd3418772623be1a3cc6b6d45cb46420cedd9154a';  -- market address
    "auctionAddress" CONSTANT TEXT := ''; -- auction address
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
        public.events e
    INNER JOIN public.ethscriptions eg ON e."hashId" = eg."hashId"
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
    ' ORDER BY e."blockTimestamp" DESC
    LIMIT ' || p_limit;
END;
$$;

ALTER FUNCTION "public"."fetch_events"("p_limit" integer, "p_type" "text", "p_collection_slug" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."fetch_events_sepolia"("p_limit" integer, "p_type" "text" DEFAULT NULL::"text", "p_collection_slug" "text" DEFAULT 'ethereum-phunks'::"text") RETURNS TABLE("hashId" "text", "from" "text", "to" "text", "tokenId" bigint, "blockTimestamp" timestamp with time zone, "type" "text", "value" "text", "slug" "text", "sha" "text")
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
    ' ORDER BY e."blockTimestamp" DESC
    LIMIT ' || p_limit;
END;$$;

ALTER FUNCTION "public"."fetch_events_sepolia"("p_limit" integer, "p_type" "text", "p_collection_slug" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."fetch_leaderboard"() RETURNS TABLE("address" "text", "points" bigint, "sales" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.address,
        u.points,
        -- other columns from users
        COUNT(e.from) as sales
    FROM
        users u
    LEFT JOIN
        events e ON u.address = e.from AND e.type = 'PhunkBought'
    GROUP BY
        u.address
    ORDER BY
        u.points DESC
    LIMIT 20;
END;
$$;

ALTER FUNCTION "public"."fetch_leaderboard"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."fetch_leaderboard_sepolia"() RETURNS TABLE("address" "text", "points" bigint, "sales" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.address,
        u.points,
        -- other columns from users
        COUNT(e.from) as sales
    FROM
        users_sepolia u
    LEFT JOIN
        events_sepolia e ON u.address = e.from AND e.type = 'PhunkBought'
    GROUP BY
        u.address
    ORDER BY
        u.points DESC
    LIMIT 20;
END;
$$;

ALTER FUNCTION "public"."fetch_leaderboard_sepolia"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."fetch_user_events_sepolia"("p_limit" integer, "p_address" "text", "p_type" "text" DEFAULT NULL::"text", "p_collection_slug" "text" DEFAULT 'ethereum-phunks'::"text") RETURNS TABLE("hashId" "text", "from" "text", "to" "text", "tokenId" bigint, "blockTimestamp" timestamp with time zone, "type" "text", "value" "text", "slug" "text", "sha" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    "marketAddress" CONSTANT TEXT := '0x3dfbc8c62d3ce0059bdaf21787ec24d5d116fe1e';  -- market address
BEGIN
    RETURN QUERY EXECUTE
    'WITH corrected_events AS (
        SELECT
            e."hashId",
            CASE
                WHEN e."from" = ''' || "marketAddress" || ''' AND e.type IN (''PhunkBought'', ''escrow'') THEN (
                    SELECT e2."from"
                    FROM public.events_sepolia e2
                    WHERE e2."to" = ''' || "marketAddress" || '''
                    AND e2."hashId" = e."hashId"
                    LIMIT 1
                )
                ELSE e."from"
            END AS "fromAddress",
            e."to" AS "toAddress",
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
            eg."slug" = ''' || p_collection_slug || '''
            AND (e."to" = ''' || p_address || ''' OR e."from" = ''' || p_address || ''' OR (
                e."from" = ''' || "marketAddress" || ''' AND e.type IN (''PhunkBought'', ''escrow'') AND (
                    SELECT e2."from"
                    FROM public.events_sepolia e2
                    WHERE e2."to" = ''' || "marketAddress" || '''
                    AND e2."hashId" = e."hashId"
                    LIMIT 1
                ) = ''' || p_address || '''
            ))
            AND e."to" != ''' || "marketAddress" || '''
            AND e.type != ''PhunkNoLongerForSale''' ||
            (CASE WHEN p_type IS NOT NULL THEN
                ' AND e.type = ''' || p_type || ''''
            ELSE
                ''
            END) ||
            ' AND NOT (e.type = ''transfer'' AND (e."to" = ''' || p_address || ''' OR e."from" = ''' || p_address || '''))'
    ' ORDER BY e."blockTimestamp" DESC
    LIMIT ' || p_limit
    || ') SELECT * FROM corrected_events;';
END;
$$;

ALTER FUNCTION "public"."fetch_user_events_sepolia"("p_limit" integer, "p_address" "text", "p_type" "text", "p_collection_slug" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_total_volume"("start_date" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP - '30 days'::interval), "end_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP, "slug_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("volume" numeric, "sales" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Sum of "value" column converted from wei to ETH
        COALESCE(SUM(e."value"::numeric / 1e18), 0) AS volume,
        -- Count of sales
        COALESCE(COUNT(*), 0) AS sales
    FROM
        public.events e
    INNER JOIN public.ethscriptions es ON e."hashId" = es."hashId"
    WHERE
        e.type = 'PhunkBought'
        AND e."blockTimestamp" BETWEEN start_date AND end_date
        AND (slug_filter IS NULL OR es.slug = slug_filter);
END;
$$;

ALTER FUNCTION "public"."get_total_volume"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "slug_filter" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_total_volume_sepolia"("start_date" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP - '30 days'::interval), "end_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP, "slug_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("volume" numeric, "sales" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Sum of "value" column converted from wei to ETH
        COALESCE(SUM(e."value"::numeric / 1e18), 0) AS volume,
        -- Count of sales
        COALESCE(COUNT(*), 0) AS sales
    FROM
        public.events_sepolia e
    INNER JOIN public.ethscriptions_sepolia es ON e."hashId" = es."hashId"
    WHERE
        e.type = 'PhunkBought'
        AND e."blockTimestamp" BETWEEN start_date AND end_date
        AND (slug_filter IS NULL OR es.slug = slug_filter);
END;
$$;

ALTER FUNCTION "public"."get_total_volume_sepolia"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "slug_filter" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."holder_count"() RETURNS integer
    LANGUAGE "sql"
    AS $$
  SELECT 
    COUNT(DISTINCT owner) 
  FROM 
    "phunks";
$$;

ALTER FUNCTION "public"."holder_count"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."_global_config" (
    "maintenance" boolean DEFAULT false NOT NULL,
    "network" bigint DEFAULT '1'::bigint NOT NULL,
    "chat" boolean DEFAULT true NOT NULL
);

ALTER TABLE "public"."_global_config" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."attributes" (
    "sha" "text" NOT NULL,
    "values" "jsonb",
    "slug" "text",
    "tokenId" bigint
);

ALTER TABLE "public"."attributes" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."auctionBids" (
    "id" bigint NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auctionId" bigint NOT NULL,
    "fromAddress" "text" DEFAULT ''::"text" NOT NULL,
    "amount" "text" DEFAULT '0'::"text" NOT NULL,
    "extended" boolean DEFAULT false NOT NULL
);

ALTER TABLE "public"."auctionBids" OWNER TO "postgres";

ALTER TABLE "public"."auctionBids" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."auctionBids_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."auctionBids_sepolia" (
    "id" bigint NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auctionId" bigint NOT NULL,
    "fromAddress" "text" DEFAULT ''::"text" NOT NULL,
    "amount" "text" DEFAULT '0'::"text" NOT NULL,
    "extended" boolean DEFAULT false NOT NULL
);

ALTER TABLE "public"."auctionBids_sepolia" OWNER TO "postgres";

COMMENT ON TABLE "public"."auctionBids_sepolia" IS 'This is a duplicate of auctionBids';

ALTER TABLE "public"."auctionBids_sepolia" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."auctionBids_sepolia_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."auctions" (
    "auctionId" bigint NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hashId" "text" NOT NULL,
    "prevOwner" "text",
    "amount" "text" DEFAULT '0'::"text" NOT NULL,
    "startTime" timestamp with time zone,
    "endTime" timestamp with time zone,
    "bidder" "text",
    "settled" boolean DEFAULT false NOT NULL
);

ALTER TABLE "public"."auctions" OWNER TO "postgres";

ALTER TABLE "public"."auctions" ALTER COLUMN "auctionId" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."auctions_auctionId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."auctions_sepolia" (
    "auctionId" bigint NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hashId" "text" NOT NULL,
    "prevOwner" "text",
    "amount" "text" DEFAULT '0'::"text" NOT NULL,
    "startTime" timestamp with time zone,
    "endTime" timestamp with time zone,
    "bidder" "text",
    "settled" boolean DEFAULT false NOT NULL
);

ALTER TABLE "public"."auctions_sepolia" OWNER TO "postgres";

COMMENT ON TABLE "public"."auctions_sepolia" IS 'This is a duplicate of auctions';

ALTER TABLE "public"."auctions_sepolia" ALTER COLUMN "auctionId" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."auctions_sepolia_auctionId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."bids" (
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hashId" "text" NOT NULL,
    "fromAddress" "text" NOT NULL,
    "value" "text" DEFAULT '0'::"text" NOT NULL,
    "txHash" "text" NOT NULL
);

ALTER TABLE "public"."bids" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."bids_sepolia" (
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hashId" "text" NOT NULL,
    "fromAddress" "text" NOT NULL,
    "value" "text" DEFAULT '0'::"text" NOT NULL,
    "txHash" "text" NOT NULL
);

ALTER TABLE "public"."bids_sepolia" OWNER TO "postgres";

COMMENT ON TABLE "public"."bids_sepolia" IS 'This is a duplicate of bids';

CREATE TABLE IF NOT EXISTS "public"."blocks" (
    "network" bigint NOT NULL,
    "blockNumber" bigint DEFAULT '0'::bigint NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."blocks" OWNER TO "postgres";

ALTER TABLE "public"."blocks" ALTER COLUMN "network" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."blocks_network_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."collections" (
    "slug" "text" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "posterHashId" "text",
    "name" "text" NOT NULL,
    "description" "text",
    "image" "text",
    "id" bigint NOT NULL,
    "singleName" "text",
    "active" boolean DEFAULT false NOT NULL,
    "supply" bigint DEFAULT '0'::bigint NOT NULL
);

ALTER TABLE "public"."collections" OWNER TO "postgres";

ALTER TABLE "public"."collections" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."collections_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."collections_sepolia" (
    "slug" "text" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "posterHashId" "text",
    "name" "text" NOT NULL,
    "description" "text",
    "image" "text",
    "id" bigint NOT NULL,
    "singleName" "text",
    "active" boolean DEFAULT false NOT NULL,
    "supply" bigint DEFAULT '0'::bigint NOT NULL
);

ALTER TABLE "public"."collections_sepolia" OWNER TO "postgres";

COMMENT ON TABLE "public"."collections_sepolia" IS 'This is a duplicate of collections';

ALTER TABLE "public"."collections_sepolia" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."collections_sepolia_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."ethscriptions" (
    "createdAt" timestamp with time zone DEFAULT "now"(),
    "creator" "text",
    "owner" "text",
    "hashId" "text" NOT NULL,
    "sha" "text" NOT NULL,
    "tokenId" bigint DEFAULT '-1'::bigint NOT NULL,
    "prevOwner" "text",
    "slug" "text",
    "oldHashId" "text",
    "locked" boolean DEFAULT false NOT NULL
);

ALTER TABLE "public"."ethscriptions" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."ethscriptions_sepolia" (
    "createdAt" timestamp with time zone DEFAULT "now"(),
    "creator" "text",
    "owner" "text",
    "hashId" "text" NOT NULL,
    "sha" "text" NOT NULL,
    "tokenId" bigint DEFAULT '-1'::bigint NOT NULL,
    "prevOwner" "text",
    "slug" "text",
    "oldHashId" "text",
    "locked" boolean DEFAULT false NOT NULL
);

ALTER TABLE "public"."ethscriptions_sepolia" OWNER TO "postgres";

COMMENT ON TABLE "public"."ethscriptions_sepolia" IS 'This is a duplicate of ethscriptions';

CREATE TABLE IF NOT EXISTS "public"."events" (
    "hashId" "text" NOT NULL,
    "from" "text" NOT NULL,
    "to" "text" NOT NULL,
    "blockHash" "text" NOT NULL,
    "txHash" "text" NOT NULL,
    "blockNumber" bigint,
    "blockTimestamp" timestamp with time zone DEFAULT "now"(),
    "type" "text",
    "value" "text",
    "txId" "text" NOT NULL,
    "txIndex" bigint DEFAULT '-1'::bigint NOT NULL
);

ALTER TABLE "public"."events" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."events_sepolia" (
    "hashId" "text" NOT NULL,
    "from" "text" NOT NULL,
    "to" "text" NOT NULL,
    "blockHash" "text" NOT NULL,
    "txHash" "text" NOT NULL,
    "blockNumber" bigint,
    "blockTimestamp" timestamp with time zone DEFAULT "now"(),
    "type" "text",
    "value" "text",
    "txId" "text" NOT NULL,
    "txIndex" bigint DEFAULT '-1'::bigint NOT NULL,
    "l2" boolean DEFAULT false NOT NULL
);

ALTER TABLE "public"."events_sepolia" OWNER TO "postgres";

COMMENT ON TABLE "public"."events_sepolia" IS 'This is a duplicate of events';

CREATE TABLE IF NOT EXISTS "public"."listings" (
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hashId" "text" NOT NULL,
    "listed" boolean DEFAULT false NOT NULL,
    "toAddress" "text",
    "minValue" "text" NOT NULL,
    "listedBy" "text" NOT NULL,
    "txHash" "text" NOT NULL
);

ALTER TABLE "public"."listings" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."listings_sepolia" (
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hashId" "text" NOT NULL,
    "listed" boolean DEFAULT false NOT NULL,
    "toAddress" "text",
    "minValue" "text" NOT NULL,
    "listedBy" "text" NOT NULL,
    "txHash" "text" NOT NULL
);

ALTER TABLE "public"."listings_sepolia" OWNER TO "postgres";

COMMENT ON TABLE "public"."listings_sepolia" IS 'This is a duplicate of listings';

CREATE TABLE IF NOT EXISTS "public"."nfts" (
    "tokenId" bigint NOT NULL,
    "hashId" "text" NOT NULL,
    "owner" "text",
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."nfts" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."nfts_sepolia" (
    "tokenId" bigint NOT NULL,
    "hashId" "text" NOT NULL,
    "owner" "text",
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."nfts_sepolia" OWNER TO "postgres";

ALTER TABLE "public"."nfts_sepolia" ALTER COLUMN "tokenId" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."nfts_sepolia_tokenId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE "public"."nfts" ALTER COLUMN "tokenId" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."nfts_tokenId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."users" (
    "createdAt" timestamp with time zone DEFAULT "now"(),
    "address" "text" NOT NULL,
    "points" bigint DEFAULT '0'::bigint NOT NULL
);

ALTER TABLE "public"."users" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."users_sepolia" (
    "createdAt" timestamp with time zone DEFAULT "now"(),
    "address" "text" NOT NULL,
    "points" bigint DEFAULT '0'::bigint NOT NULL
);

ALTER TABLE "public"."users_sepolia" OWNER TO "postgres";

COMMENT ON TABLE "public"."users_sepolia" IS 'This is a duplicate of users';

ALTER TABLE ONLY "public"."_global_config"
    ADD CONSTRAINT "admin_network_key" UNIQUE ("network");

ALTER TABLE ONLY "public"."_global_config"
    ADD CONSTRAINT "admin_pkey" PRIMARY KEY ("network");

ALTER TABLE ONLY "public"."attributes"
    ADD CONSTRAINT "attributes_pkey" PRIMARY KEY ("sha");

ALTER TABLE ONLY "public"."attributes"
    ADD CONSTRAINT "attributes_sha_key" UNIQUE ("sha");

ALTER TABLE ONLY "public"."auctionBids"
    ADD CONSTRAINT "auctionBids_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."auctionBids_sepolia"
    ADD CONSTRAINT "auctionBids_sepolia_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."auctions"
    ADD CONSTRAINT "auctions_pkey" PRIMARY KEY ("auctionId");

ALTER TABLE ONLY "public"."auctions_sepolia"
    ADD CONSTRAINT "auctions_sepolia_pkey" PRIMARY KEY ("auctionId");

ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_pkey" PRIMARY KEY ("hashId");

ALTER TABLE ONLY "public"."bids_sepolia"
    ADD CONSTRAINT "bids_sepolia_pkey" PRIMARY KEY ("hashId");

ALTER TABLE ONLY "public"."blocks"
    ADD CONSTRAINT "blocks_pkey" PRIMARY KEY ("network");

ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_id_key" UNIQUE ("id");

ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_pkey" PRIMARY KEY ("slug");

ALTER TABLE ONLY "public"."collections_sepolia"
    ADD CONSTRAINT "collections_sepolia_id_key" UNIQUE ("id");

ALTER TABLE ONLY "public"."collections_sepolia"
    ADD CONSTRAINT "collections_sepolia_pkey" PRIMARY KEY ("slug");

ALTER TABLE ONLY "public"."ethscriptions"
    ADD CONSTRAINT "ethscriptions_hashId_key" UNIQUE ("hashId");

ALTER TABLE ONLY "public"."ethscriptions"
    ADD CONSTRAINT "ethscriptions_oldHashId_key" UNIQUE ("oldHashId");

ALTER TABLE ONLY "public"."ethscriptions"
    ADD CONSTRAINT "ethscriptions_pkey" PRIMARY KEY ("hashId");

ALTER TABLE ONLY "public"."ethscriptions_sepolia"
    ADD CONSTRAINT "ethscriptions_sepolia_hashId_key" UNIQUE ("hashId");

ALTER TABLE ONLY "public"."ethscriptions_sepolia"
    ADD CONSTRAINT "ethscriptions_sepolia_oldHashId_key" UNIQUE ("oldHashId");

ALTER TABLE ONLY "public"."ethscriptions_sepolia"
    ADD CONSTRAINT "ethscriptions_sepolia_pkey" PRIMARY KEY ("hashId");

ALTER TABLE ONLY "public"."ethscriptions_sepolia"
    ADD CONSTRAINT "ethscriptions_sepolia_sha_key" UNIQUE ("sha");

ALTER TABLE ONLY "public"."ethscriptions"
    ADD CONSTRAINT "ethscriptions_sha_key" UNIQUE ("sha");

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("txId");

ALTER TABLE ONLY "public"."events_sepolia"
    ADD CONSTRAINT "events_sepolia_pkey" PRIMARY KEY ("txId");

ALTER TABLE ONLY "public"."events_sepolia"
    ADD CONSTRAINT "events_sepolia_txId_key" UNIQUE ("txId");

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_txId_key" UNIQUE ("txId");

ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_pkey" PRIMARY KEY ("hashId");

ALTER TABLE ONLY "public"."listings_sepolia"
    ADD CONSTRAINT "listings_sepolia_pkey" PRIMARY KEY ("hashId");

ALTER TABLE ONLY "public"."nfts"
    ADD CONSTRAINT "nfts_pkey" PRIMARY KEY ("tokenId", "hashId");

ALTER TABLE ONLY "public"."nfts_sepolia"
    ADD CONSTRAINT "nfts_sepolia_pkey" PRIMARY KEY ("tokenId", "hashId");

ALTER TABLE ONLY "public"."nfts_sepolia"
    ADD CONSTRAINT "nfts_sepolia_tokenId_key" UNIQUE ("tokenId");

ALTER TABLE ONLY "public"."nfts"
    ADD CONSTRAINT "nfts_tokenId_key" UNIQUE ("tokenId");

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("address");

ALTER TABLE ONLY "public"."users_sepolia"
    ADD CONSTRAINT "users_sepolia_pkey" PRIMARY KEY ("address");

CREATE INDEX "ethscriptions_hashId_idx" ON "public"."ethscriptions" USING "btree" ("hashId");

CREATE INDEX "ethscriptions_sepolia_hashId_idx" ON "public"."ethscriptions_sepolia" USING "btree" ("hashId");

CREATE INDEX "idx_attributes" ON "public"."attributes" USING "gin" ("values");

ALTER TABLE ONLY "public"."attributes"
    ADD CONSTRAINT "attributes_sha_fkey" FOREIGN KEY ("sha") REFERENCES "public"."ethscriptions"("sha");

ALTER TABLE ONLY "public"."auctionBids"
    ADD CONSTRAINT "auctionBids_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "public"."auctions"("auctionId");

ALTER TABLE ONLY "public"."auctions"
    ADD CONSTRAINT "auctions_hashId_fkey" FOREIGN KEY ("hashId") REFERENCES "public"."ethscriptions"("hashId");

ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_hashId_fkey" FOREIGN KEY ("hashId") REFERENCES "public"."ethscriptions"("hashId");

ALTER TABLE ONLY "public"."ethscriptions"
    ADD CONSTRAINT "ethscriptions_slug_fkey" FOREIGN KEY ("slug") REFERENCES "public"."collections"("slug");

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_hashId_fkey" FOREIGN KEY ("hashId") REFERENCES "public"."ethscriptions"("hashId") ON UPDATE RESTRICT ON DELETE CASCADE;

ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_hashId_fkey" FOREIGN KEY ("hashId") REFERENCES "public"."ethscriptions"("hashId");

ALTER TABLE ONLY "public"."nfts"
    ADD CONSTRAINT "nfts_hashId_fkey" FOREIGN KEY ("hashId") REFERENCES "public"."ethscriptions"("hashId");

ALTER TABLE ONLY "public"."nfts_sepolia"
    ADD CONSTRAINT "nfts_sepolia_hashId_fkey" FOREIGN KEY ("hashId") REFERENCES "public"."ethscriptions_sepolia"("hashId");

ALTER TABLE ONLY "public"."auctionBids_sepolia"
    ADD CONSTRAINT "public_auctionBids_sepolia_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "public"."auctions"("auctionId");

ALTER TABLE ONLY "public"."auctions_sepolia"
    ADD CONSTRAINT "public_auctions_sepolia_hashId_fkey" FOREIGN KEY ("hashId") REFERENCES "public"."ethscriptions"("hashId");

ALTER TABLE ONLY "public"."bids_sepolia"
    ADD CONSTRAINT "public_bids_sepolia_hashId_fkey" FOREIGN KEY ("hashId") REFERENCES "public"."ethscriptions_sepolia"("hashId");

ALTER TABLE ONLY "public"."ethscriptions_sepolia"
    ADD CONSTRAINT "public_ethscriptions_sepolia_slug_fkey" FOREIGN KEY ("slug") REFERENCES "public"."collections_sepolia"("slug");

ALTER TABLE ONLY "public"."events_sepolia"
    ADD CONSTRAINT "public_events_sepolia_hashId_fkey" FOREIGN KEY ("hashId") REFERENCES "public"."ethscriptions_sepolia"("hashId");

ALTER TABLE ONLY "public"."listings_sepolia"
    ADD CONSTRAINT "public_listings_sepolia_hashId_fkey" FOREIGN KEY ("hashId") REFERENCES "public"."ethscriptions_sepolia"("hashId");

CREATE POLICY "Enable read access for all users" ON "public"."_global_config" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."attributes" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."auctionBids" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."bids" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."bids_sepolia" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."blocks" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."collections" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."collections_sepolia" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."ethscriptions" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."ethscriptions_sepolia" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."events" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."events_sepolia" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."listings" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."listings_sepolia" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."nfts" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."nfts_sepolia" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."users" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."users_sepolia" FOR SELECT USING (true);

ALTER TABLE "public"."_global_config" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."attributes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."auctionBids" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."auctionBids_sepolia" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."auctions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."auctions_sepolia" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."bids" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."bids_sepolia" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."blocks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."collections" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."collections_sepolia" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."ethscriptions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."ethscriptions_sepolia" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."events_sepolia" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."listings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."listings_sepolia" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."nfts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."nfts_sepolia" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."users_sepolia" ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."addresses_are_holders"("addresses" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."addresses_are_holders"("addresses" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."addresses_are_holders"("addresses" "text"[]) TO "service_role";

GRANT ALL ON FUNCTION "public"."addresses_are_holders_sepolia"("addresses" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."addresses_are_holders_sepolia"("addresses" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."addresses_are_holders_sepolia"("addresses" "text"[]) TO "service_role";

GRANT ALL ON FUNCTION "public"."fetch_all_with_pagination"("p_slug" "text", "p_from_num" integer, "p_to_num" integer, "p_filters" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_all_with_pagination"("p_slug" "text", "p_from_num" integer, "p_to_num" integer, "p_filters" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_all_with_pagination"("p_slug" "text", "p_from_num" integer, "p_to_num" integer, "p_filters" "jsonb") TO "service_role";

GRANT ALL ON FUNCTION "public"."fetch_all_with_pagination_sepolia"("p_slug" "text", "p_from_num" integer, "p_to_num" integer, "p_filters" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_all_with_pagination_sepolia"("p_slug" "text", "p_from_num" integer, "p_to_num" integer, "p_filters" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_all_with_pagination_sepolia"("p_slug" "text", "p_from_num" integer, "p_to_num" integer, "p_filters" "jsonb") TO "service_role";

GRANT ALL ON FUNCTION "public"."fetch_collections_with_previews"("preview_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_collections_with_previews"("preview_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_collections_with_previews"("preview_limit" integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."fetch_collections_with_previews_sepolia"("preview_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_collections_with_previews_sepolia"("preview_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_collections_with_previews_sepolia"("preview_limit" integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."fetch_ethscriptions_owned_with_listings_and_bids"("address" "text", "collection_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_ethscriptions_owned_with_listings_and_bids"("address" "text", "collection_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_ethscriptions_owned_with_listings_and_bids"("address" "text", "collection_slug" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."fetch_ethscriptions_owned_with_listings_and_bids_sepolia"("address" "text", "collection_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_ethscriptions_owned_with_listings_and_bids_sepolia"("address" "text", "collection_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_ethscriptions_owned_with_listings_and_bids_sepolia"("address" "text", "collection_slug" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."fetch_ethscriptions_with_listings_and_bids"("collection_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_ethscriptions_with_listings_and_bids"("collection_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_ethscriptions_with_listings_and_bids"("collection_slug" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."fetch_ethscriptions_with_listings_and_bids_sepolia"("collection_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_ethscriptions_with_listings_and_bids_sepolia"("collection_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_ethscriptions_with_listings_and_bids_sepolia"("collection_slug" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."fetch_events"("p_limit" integer, "p_type" "text", "p_collection_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_events"("p_limit" integer, "p_type" "text", "p_collection_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_events"("p_limit" integer, "p_type" "text", "p_collection_slug" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."fetch_events_sepolia"("p_limit" integer, "p_type" "text", "p_collection_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_events_sepolia"("p_limit" integer, "p_type" "text", "p_collection_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_events_sepolia"("p_limit" integer, "p_type" "text", "p_collection_slug" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."fetch_leaderboard"() TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_leaderboard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_leaderboard"() TO "service_role";

GRANT ALL ON FUNCTION "public"."fetch_leaderboard_sepolia"() TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_leaderboard_sepolia"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_leaderboard_sepolia"() TO "service_role";

GRANT ALL ON FUNCTION "public"."fetch_user_events_sepolia"("p_limit" integer, "p_address" "text", "p_type" "text", "p_collection_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_user_events_sepolia"("p_limit" integer, "p_address" "text", "p_type" "text", "p_collection_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_user_events_sepolia"("p_limit" integer, "p_address" "text", "p_type" "text", "p_collection_slug" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_total_volume"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "slug_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_total_volume"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "slug_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_total_volume"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "slug_filter" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_total_volume_sepolia"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "slug_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_total_volume_sepolia"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "slug_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_total_volume_sepolia"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "slug_filter" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."holder_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."holder_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."holder_count"() TO "service_role";

GRANT ALL ON TABLE "public"."_global_config" TO "anon";
GRANT ALL ON TABLE "public"."_global_config" TO "authenticated";
GRANT ALL ON TABLE "public"."_global_config" TO "service_role";

GRANT ALL ON TABLE "public"."attributes" TO "anon";
GRANT ALL ON TABLE "public"."attributes" TO "authenticated";
GRANT ALL ON TABLE "public"."attributes" TO "service_role";

GRANT ALL ON TABLE "public"."auctionBids" TO "anon";
GRANT ALL ON TABLE "public"."auctionBids" TO "authenticated";
GRANT ALL ON TABLE "public"."auctionBids" TO "service_role";

GRANT ALL ON SEQUENCE "public"."auctionBids_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."auctionBids_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."auctionBids_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."auctionBids_sepolia" TO "anon";
GRANT ALL ON TABLE "public"."auctionBids_sepolia" TO "authenticated";
GRANT ALL ON TABLE "public"."auctionBids_sepolia" TO "service_role";

GRANT ALL ON SEQUENCE "public"."auctionBids_sepolia_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."auctionBids_sepolia_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."auctionBids_sepolia_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."auctions" TO "anon";
GRANT ALL ON TABLE "public"."auctions" TO "authenticated";
GRANT ALL ON TABLE "public"."auctions" TO "service_role";

GRANT ALL ON SEQUENCE "public"."auctions_auctionId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."auctions_auctionId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."auctions_auctionId_seq" TO "service_role";

GRANT ALL ON TABLE "public"."auctions_sepolia" TO "anon";
GRANT ALL ON TABLE "public"."auctions_sepolia" TO "authenticated";
GRANT ALL ON TABLE "public"."auctions_sepolia" TO "service_role";

GRANT ALL ON SEQUENCE "public"."auctions_sepolia_auctionId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."auctions_sepolia_auctionId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."auctions_sepolia_auctionId_seq" TO "service_role";

GRANT ALL ON TABLE "public"."bids" TO "anon";
GRANT ALL ON TABLE "public"."bids" TO "authenticated";
GRANT ALL ON TABLE "public"."bids" TO "service_role";

GRANT ALL ON TABLE "public"."bids_sepolia" TO "anon";
GRANT ALL ON TABLE "public"."bids_sepolia" TO "authenticated";
GRANT ALL ON TABLE "public"."bids_sepolia" TO "service_role";

GRANT ALL ON TABLE "public"."blocks" TO "anon";
GRANT ALL ON TABLE "public"."blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."blocks" TO "service_role";

GRANT ALL ON SEQUENCE "public"."blocks_network_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."blocks_network_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."blocks_network_seq" TO "service_role";

GRANT ALL ON TABLE "public"."collections" TO "anon";
GRANT ALL ON TABLE "public"."collections" TO "authenticated";
GRANT ALL ON TABLE "public"."collections" TO "service_role";

GRANT ALL ON SEQUENCE "public"."collections_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."collections_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."collections_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."collections_sepolia" TO "anon";
GRANT ALL ON TABLE "public"."collections_sepolia" TO "authenticated";
GRANT ALL ON TABLE "public"."collections_sepolia" TO "service_role";

GRANT ALL ON SEQUENCE "public"."collections_sepolia_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."collections_sepolia_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."collections_sepolia_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."ethscriptions" TO "anon";
GRANT ALL ON TABLE "public"."ethscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."ethscriptions" TO "service_role";

GRANT ALL ON TABLE "public"."ethscriptions_sepolia" TO "anon";
GRANT ALL ON TABLE "public"."ethscriptions_sepolia" TO "authenticated";
GRANT ALL ON TABLE "public"."ethscriptions_sepolia" TO "service_role";

GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";

GRANT ALL ON TABLE "public"."events_sepolia" TO "anon";
GRANT ALL ON TABLE "public"."events_sepolia" TO "authenticated";
GRANT ALL ON TABLE "public"."events_sepolia" TO "service_role";

GRANT ALL ON TABLE "public"."listings" TO "anon";
GRANT ALL ON TABLE "public"."listings" TO "authenticated";
GRANT ALL ON TABLE "public"."listings" TO "service_role";

GRANT ALL ON TABLE "public"."listings_sepolia" TO "anon";
GRANT ALL ON TABLE "public"."listings_sepolia" TO "authenticated";
GRANT ALL ON TABLE "public"."listings_sepolia" TO "service_role";

GRANT ALL ON TABLE "public"."nfts" TO "anon";
GRANT ALL ON TABLE "public"."nfts" TO "authenticated";
GRANT ALL ON TABLE "public"."nfts" TO "service_role";

GRANT ALL ON TABLE "public"."nfts_sepolia" TO "anon";
GRANT ALL ON TABLE "public"."nfts_sepolia" TO "authenticated";
GRANT ALL ON TABLE "public"."nfts_sepolia" TO "service_role";

GRANT ALL ON SEQUENCE "public"."nfts_sepolia_tokenId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."nfts_sepolia_tokenId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."nfts_sepolia_tokenId_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."nfts_tokenId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."nfts_tokenId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."nfts_tokenId_seq" TO "service_role";

GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";

GRANT ALL ON TABLE "public"."users_sepolia" TO "anon";
GRANT ALL ON TABLE "public"."users_sepolia" TO "authenticated";
GRANT ALL ON TABLE "public"."users_sepolia" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";

RESET ALL;
