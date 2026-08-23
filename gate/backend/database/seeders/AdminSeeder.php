<?php

namespace Database\Seeders;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        //Admin Seeder
        $user = User::create([
            'firstname' => 'Admin',
            'lastname' => 'User',
            'dep_id'=>1,
            'default_base'=>0,
            'username' => env('GATE_ADMIN_USERNAME', 'admin'),
            'password' => bcrypt(env('GATE_ADMIN_PASSWORD', 'password')),
        ]);
      
       
       
        $user->assignRole('Admin');
    }
}
