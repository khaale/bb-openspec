# OpenSpec

Browse repository-backed OpenSpec changes in bb, inspect artifacts and read-only task progress, and launch or attach agent threads in the selected environment.

No external account is needed. Reads standard `openspec/changes` files from local checkouts or registered OpenSpec stores on connected machines. Store discovery uses the OpenSpec CLI; progress updates use native file watching. Agents update the source files. Custom workflow schemas and Worksets are not interpreted.
