-- Run AFTER creating PRIVATE Storage bucket garment-images in the Supabase dashboard.
create policy "Owner read garment images" on storage.objects for select to authenticated
using (bucket_id = 'garment-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owner upload garment images" on storage.objects for insert to authenticated
with check (bucket_id = 'garment-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owner update garment images" on storage.objects for update to authenticated
using (bucket_id = 'garment-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'garment-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owner delete garment images" on storage.objects for delete to authenticated
using (bucket_id = 'garment-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
