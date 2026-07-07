<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Users\UserAdminService;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(private UserAdminService $users)
    {
    }

    public function index()
    {
        return $this->users->users();
    }

    public function show(int $id)
    {
        return $this->users->userInfo($id);
    }

    public function store(Request $request)
    {
        return $this->users->newUser($request);
    }

    public function update(Request $request)
    {
        return $this->users->editUser($request);
    }

    public function destroy(Request $request)
    {
        return $this->users->deleteUser($request);
    }

    public function assignableRoles()
    {
        return $this->users->assignableRoles();
    }
}
