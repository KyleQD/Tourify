"""Local-only concurrent RPC contract. Run AFTER bootstrap + migration in a disposable DB."""
import concurrent.futures
import json
import subprocess
import sys

port = sys.argv[1] if len(sys.argv) > 1 else "55439"
database = sys.argv[2] if len(sys.argv) > 2 else "postgres"
base = ["psql", "-h", "127.0.0.1", "-p", port, "-d", database, "-v", "ON_ERROR_STOP=1", "-At"]
def sql(statement):
    return subprocess.run(base + ["-c", statement], capture_output=True, text=True, check=True).stdout.strip()
ids = {k: f"aaaaaaaa-aaaa-4aaa-8aaa-{n:012d}" for n, k in enumerate(["manager", "worker", "employer", "staff", "event", "assignment"], 1)}
try:
    sql(f"""
    insert into auth.users values('{ids['manager']}'),('{ids['worker']}');
    insert into test_hiring_managers values('{ids['manager']}','organization','{ids['employer']}');
    insert into staff_members values('{ids['staff']}','{ids['worker']}','organization','{ids['employer']}','active');
    insert into events_v2 values('{ids['event']}','settled',now()-interval '1 day','{ids['manager']}','{ids['employer']}',null);
    insert into events values('{ids['event']}',null,'published');
    insert into employment_assignments(id,user_id,employer_entity_type,employer_entity_id,staff_member_id,role_key,role_title,starts_at,ends_at,status,event_id)
    values('{ids['assignment']}','{ids['worker']}','organization','{ids['employer']}','{ids['staff']}','stage-manager','Stage Manager',now()-interval '2 days',now()-interval '1 day','active','{ids['event']}');
    """)
    def verify(_):
        return sql(f"set role authenticated; set request.jwt.claim.sub='{ids['manager']}'; select verify_workforce_assignment('{ids['assignment']}','Successful role delivery','Signed closeout and attendance');").splitlines()[-1]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(verify, range(16)))
    assert len(set(results)) == 1, results
    assert sql(f"select count(*) from workforce_role_credits where user_id='{ids['worker']}'") == "1"
    assert sql(f"select count(*) from workforce_advancement_history where user_id='{ids['worker']}'") == "2"
    print(json.dumps({"concurrent_requests": 16, "unique_credits": 1, "role_and_family_advancements": 2, "result": "passed"}))
finally:
    # Remove ONLY this test's fixtures from the explicitly local disposable DB.
    sql(f"""delete from workforce_advancement_history where user_id='{ids['worker']}';
    delete from workforce_role_credits where user_id='{ids['worker']}';
    delete from employment_assignments where id='{ids['assignment']}';
    delete from events where id='{ids['event']}'; delete from events_v2 where id='{ids['event']}';
    delete from staff_members where id='{ids['staff']}'; delete from test_hiring_managers where user_id='{ids['manager']}';
    delete from auth.users where id in('{ids['manager']}','{ids['worker']}');""")
