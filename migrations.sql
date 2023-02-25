CREATE TYPE user_type AS ENUM (
    'STUDENT', 'TUTOR'
);

CREATE TABLE users (
    id bigserial PRIMARY KEY,
    username text UNIQUE, 
    password text,
    type user_type,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone
);

CREATE TYPE assignment_status AS ENUM (
    'SCHEDULED', 'ONGOING', 'SUBMITTED'
);

CREATE TABLE assignments (
    id bigserial PRIMARY KEY, 
    description text, 
    status assignment_status,
    created_by bigint REFERENCES users (id),
    published_at timestamp with time zone,
    deadline_date timestamp with time zone,
    is_deleted boolean DEFAULT false,
    updated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT NOW()
);

CREATE TABLE student_assignments (
    id bigserial PRIMARY KEY, 
    user_id bigint REFERENCES users (id),
    assignment_id bigint REFERENCES assignments (id),
    answers text,
    is_deleted boolean DEFAULT false,
    SUBMITTED_at timestamp with time zone,
    remark text,
    updated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT NOW()
);
